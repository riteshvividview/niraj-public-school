// Sets up the uniform catalogue from the school's bundle price chart
// ("Final Uniforms Cost-26-27 … Parents.xlsx"):
//   1. adds the regular uniform / kit items for the classes that have none yet
//      (Nursery, LKG, UKG, Class 1, 3, 4, 5, 6, 7, 9, 10 — Class 11 is not set up in the app);
//   2. creates the NEW-ADMISSION items (the yellow-highlighted ones: hoody, belt, girls' cycling
//      shorts) once, common to all classes, with a gender / class range where the chart has one;
//   3. RETIRES the copies of those items that were added to the Class 2 / Class 8 lists
//      (hidden, never deleted — past orders and exchanges still point at them).
// It never deletes or edits any other existing row, and prints every difference it finds
// between the chart and what is already in Class 2 / Class 8.
//
//   node scripts/setup-new-admission-catalogue.mjs            # dry run
//   node scripts/setup-new-admission-catalogue.mjs --apply    # writes
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
const { Pool } = require("pg");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
require("dotenv").config({ path: path.join(root, ".env"), quiet: true });
const APPLY = process.argv.includes("--apply");
const FILE = path.join(root, "public", "Final Uniforms Cost-26-27 - 28-01-2026 Parents (1).xlsx");

const clean = (v) => (v == null ? "" : String(v).replace(/\s+/g, " ").trim());
const FIXES = { "NIR Regualr Socks": "NIR Regular Socks" };
const GROUPS = {
  "nur to ukg": { label: "Nursery–UKG", classes: ["Nursery", "LKG", "UKG"], from: -2, to: 0 },
  "i to v": { label: "I–V", classes: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"], from: 1, to: 5 },
  "vi to xi": { label: "VI–X (XI not set up)", classes: ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"], from: 6, to: 11 },
};
const FIRST_ORDER = -2;
const LAST_ORDER = 11;

function parseChart() {
  const wb = XLSX.readFile(FILE, { cellStyles: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, raw: true });
  // sheet_to_json drops blank rows, so read cell by cell for styles using the A1 addresses of the original sheet.
  const range = XLSX.utils.decode_range(ws["!ref"]);
  const cell = (r, c) => ws[XLSX.utils.encode_cell({ r, c })];
  const out = [];
  for (const [nameCol, gender] of [[1, "female"], [6, "male"]]) {
    let group = null;
    for (let r = 2; r <= range.e.r; r++) {
      const labelCell = cell(r, nameCol - 1);
      const name = clean(cell(r, nameCol)?.v);
      if (clean(labelCell?.v) && /^(girls|boys)\s*-/i.test(clean(labelCell.v))) {
        const key = clean(labelCell.v).replace(/^(girls|boys)\s*-\s*/i, "").toLowerCase();
        group = GROUPS[key] ?? null;
        if (!group) throw new Error("Unknown group: " + clean(labelCell.v));
      }
      if (!name || name === "Product Name" || /^total$/i.test(name) || /^note/i.test(name)) continue;
      if (!group) continue;
      const pcs = Number(cell(r, nameCol + 1)?.v);
      const unit = Number(cell(r, nameCol + 2)?.v);
      const total = Number(cell(r, nameCol + 3)?.v);
      if (!Number.isFinite(pcs) || !Number.isFinite(total)) continue;
      if (pcs * unit !== total) throw new Error(`Chart row doesn't add up: ${name} ${pcs}×${unit}≠${total}`);
      const base = FIXES[name] ?? name;
      const yellow = cell(r, nameCol)?.s?.fgColor?.rgb === "FFFF00";
      out.push({ gender, group, base, pcs, total, yellow, name: pcs === 2 ? `${base} (Set of 2)` : base, category: /socks/i.test(base) ? "kit" : "uniform" });
    }
  }
  return out;
}

const newId = () => randomBytes(12).toString("hex");
const baseOf = (name) => name.replace(/\s*\(Set of 2\)\s*$/i, "").trim();

async function main() {
  const chart = parseChart();
  const pool = new Pool({ connectionString: process.env.DATABASE_URI });
  const school = (await pool.query("select id from schools limit 1")).rows[0].id;
  const classes = (await pool.query(`select id, label, "order" from class_levels`)).rows;
  const classByLabel = new Map(classes.map((c) => [c.label, c]));
  const db = (
    await pool.query(
      `select u.id, c.label as class_label, u.gender, u.name, u.category, u.new_admission, u.retired,
              (select s.price from uniform_items_size_options s where s._parent_id = u.id order by s._order limit 1) as price
         from uniform_items u left join class_levels c on c.id = u.class_level_id`,
    )
  ).rows;

  const regular = chart.filter((i) => !i.yellow);
  const yellow = chart.filter((i) => i.yellow);

  // ---- new-admission items: merge the yellow rows of the chart ---------------------------------
  const byName = new Map();
  for (const i of yellow) {
    const list = byName.get(i.name) ?? [];
    list.push(i);
    byName.set(i.name, list);
  }
  const newItems = [];
  for (const [name, list] of byName) {
    const prices = new Set(list.map((i) => i.total));
    if (prices.size !== 1) throw new Error(`"${name}" has different prices in different groups: ${[...prices].join(", ")}`);
    const genders = [...new Set(list.map((i) => i.gender))];
    const orderOf = (g) => {
      const mine = list.filter((i) => i.gender === g);
      return [Math.min(...mine.map((i) => i.group.from)), Math.max(...mine.map((i) => i.group.to))];
    };
    const ranges = genders.map(orderOf);
    const sameRange = ranges.every((r) => r[0] === ranges[0][0] && r[1] === ranges[0][1]);
    const emit = (gender, [from, to]) =>
      newItems.push({
        name,
        gender,
        price: [...prices][0],
        category: list[0].category,
        from: from <= FIRST_ORDER ? null : from,
        to: to >= LAST_ORDER ? null : to,
      });
    if (genders.length === 2 && sameRange) emit(null, ranges[0]);
    else genders.forEach((g, idx) => emit(g, ranges[idx]));
  }

  // ---- report ----------------------------------------------------------------------------------------
  console.log("Chart rows read:", chart.length, `(regular ${regular.length}, new-admission ${yellow.length})\n`);
  console.log("NEW-ADMISSION items to create (common to all classes):");
  for (const i of newItems) console.log(`  + ${i.name.padEnd(48)} ₹${i.price}  ${i.gender ?? "everyone"}  classes: ${i.from == null && i.to == null ? "all" : `${i.from ?? "first"}…${i.to ?? "last"} (by class order)`}`);

  const toCreate = [];
  const diffs = [];
  for (const item of regular) {
    for (const label of item.group.classes) {
      const cls = classByLabel.get(label);
      if (!cls) continue;
      const existing = db.find((r) => r.class_label === label && r.gender === item.gender && baseOf(r.name) === item.base && !r.new_admission);
      if (existing) {
        if (Number(existing.price) !== item.total) diffs.push(`${label} ${item.gender}: "${existing.name}" is ₹${existing.price} in the app but ₹${item.total} in the chart`);
        continue;
      }
      // Classes that already have a set (2, 8) are not topped up automatically — only report.
      const classHasSet = db.some((r) => r.class_label === label && r.gender === item.gender && !r.new_admission && !r.retired);
      if (classHasSet) diffs.push(`${label} ${item.gender}: chart has "${item.name}" ₹${item.total} but the app has no such item`);
      else toCreate.push({ cls, item });
    }
  }
  const countByClass = {};
  toCreate.forEach(({ cls, item }) => (countByClass[`${cls.label} ${item.gender}`] = (countByClass[`${cls.label} ${item.gender}`] ?? 0) + 1));
  console.log(`\nREGULAR items to create: ${toCreate.length}`);
  Object.entries(countByClass).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  // extra items already in the app that the chart doesn't have (info only)
  for (const label of ["Class 2", "Class 8"]) {
    for (const gender of ["female", "male"]) {
      const chartBases = new Set(chart.filter((i) => i.gender === gender && i.group.classes.includes(label)).map((i) => i.base));
      for (const row of db.filter((r) => r.class_label === label && r.gender === gender && !r.new_admission)) {
        if (!chartBases.has(baseOf(row.name))) diffs.push(`${label} ${gender}: "${row.name}" is in the app but not in the chart`);
      }
    }
  }
  const sizeExtras = (await pool.query(`select c.label, u.gender, u.name, s.size, s.price from uniform_items u join class_levels c on c.id=u.class_level_id join uniform_items_size_options s on s._parent_id=u.id where s._order > (select min(m._order) from uniform_items_size_options m where m._parent_id = u.id)`)).rows;
  sizeExtras.forEach((r) => diffs.push(`${r.label} ${r.gender}: "${r.name}" also has size ${r.size} at ₹${r.price} (the chart only lists the standard size)`));

  const toRetire = db.filter((r) => r.class_label && !r.new_admission && !r.retired && yellow.some((y) => y.base === baseOf(r.name) && y.gender === r.gender && y.group.classes.includes(r.class_label)));
  console.log(`\nRETIRE (hide, keep for past orders): ${toRetire.length}`);
  toRetire.forEach((r) => console.log(`  - ${r.class_label} ${r.gender}: ${r.name}`));
  const alreadyNew = db.filter((r) => r.new_admission);
  if (alreadyNew.length) console.log(`\n(${alreadyNew.length} new-admission item(s) already exist and will not be duplicated)`);

  console.log(`\nDIFFERENCES between the chart and the app (NOT changed — for you to check): ${diffs.length}`);
  diffs.forEach((d) => console.log("  ! " + d));

  if (!APPLY) {
    console.log("\nDry run — nothing written. Re-run with --apply.");
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    const insertItem = async ({ classId, name, category, gender, price, newAdmission, from, to }) => {
      const { rows } = await client.query(
        `insert into uniform_items (school_id, class_level_id, name, category, gender, new_admission, new_admission_from_order, new_admission_to_order, retired)
         values ($1,$2,$3,$4,$5,$6,$7,$8,false) returning id`,
        [school, classId, name, category, gender, newAdmission, from ?? null, to ?? null],
      );
      await client.query(`insert into uniform_items_size_options (_order, _parent_id, id, size, price) values (1, $1, $2, 'Standard', $3)`, [rows[0].id, newId(), price]);
    };
    for (const n of newItems) {
      const exists = db.some((r) => r.new_admission && !r.retired && r.name === n.name && (r.gender ?? null) === n.gender);
      if (!exists) await insertItem({ classId: null, name: n.name, category: n.category, gender: n.gender, price: n.price, newAdmission: true, from: n.from, to: n.to });
    }
    for (const { cls, item } of toCreate) {
      await insertItem({ classId: cls.id, name: item.name, category: item.category, gender: item.gender, price: item.total, newAdmission: false });
    }
    for (const r of toRetire) await client.query(`update uniform_items set retired = true, updated_at = now() where id = $1`, [r.id]);
    await client.query("commit");
    console.log(`\nDone: ${newItems.length} new-admission item(s), ${toCreate.length} regular item(s) created, ${toRetire.length} retired.`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
