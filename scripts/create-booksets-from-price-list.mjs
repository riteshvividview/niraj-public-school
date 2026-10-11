// Creates the class levels and book sets (title + price + variant) for every
// class listed in the school's price sheet, so the contents importer has a set to
// fill. Prices come ONLY from "School Testing Requirements/Pre -NUR TO 10th CLASS
// BOOKS LIST ... .xlsx" (the school's 2026-27 book price list) — nothing is guessed.
//
//   node scripts/create-booksets-from-price-list.mjs            # dry run
//   node scripts/create-booksets-from-price-list.mjs --apply    # writes
//
// Existing sets are never changed; a set that already exists with a DIFFERENT
// price is reported, not overwritten. Re-runnable.
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
const { Pool } = require("pg");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
require("dotenv").config({ path: path.join(root, ".env"), quiet: true });
const APPLY = process.argv.includes("--apply");

const PRICE_FILE = path.join(root, "School Testing Requirements", "Pre -NUR TO 10th CLASS BOOKS LIST FOR  26-27 for UG for Link.xlsx");
const ELECTIVE_TITLE = { ena: "ENA", homeScience: "Home Science", roboticsAI: "Robotics" };
// Class sort order: Grade N = N (as the existing Class 2 / Class 8 rows); pre-primary sits below Class 1.
const PRE_PRIMARY_ORDER = { Nursery: -2, LKG: -1, UKG: 0 };

function parsePriceList() {
  const wb = XLSX.readFile(PRICE_FILE);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets.Sheet2, { header: 1, blankrows: false });
  const out = [];
  let stream = null;
  for (const r of rows) {
    const label = String(r[2] ?? "").replace(/\s+/g, " ").trim();
    const price = r[3];
    if (!label) continue;
    const group = label.match(/^Class - \d+ \((ECONOMICS|SCIENCE) - Group\)$/i);
    if (group) {
      stream = group[1].toLowerCase();
      continue;
    }
    if (typeof price !== "number") continue;
    let m;
    if ((m = label.match(/^Pre Nursery$/i))) continue; // no contents list supplied — not created
    if ((m = label.match(/^(Nursery|LKG)$/i))) {
      out.push({ classLabel: m[1].toUpperCase() === "LKG" ? "LKG" : "Nursery", language: null, stream: null, elective: null, price });
    } else if ((m = label.match(/^UKG - 2nd Lang (Hindi|Telugu)$/i))) {
      out.push({ classLabel: "UKG", language: m[1].toLowerCase(), stream: null, elective: null, price });
    } else if ((m = label.match(/^Class - (\d+) - 2nd Lang (Hindi|Telugu)$/i))) {
      out.push({ classLabel: `Class ${m[1]}`, language: m[2].toLowerCase(), stream: null, elective: null, price });
    } else if ((m = label.match(/^Class - (\d+) - 2nd Lang (Hindi|Telugu) with (ENA|Home Science|Robotics)$/i))) {
      if (!stream) throw new Error("group header missing before: " + label);
      const el = m[3].toLowerCase();
      out.push({
        classLabel: `Class ${m[1]}`,
        language: m[2].toLowerCase(),
        stream,
        elective: el === "ena" ? "ena" : el === "home science" ? "homeScience" : "roboticsAI",
        price,
      });
    } else {
      throw new Error("Unrecognised price-list row: " + label);
    }
  }
  return out;
}

const titleOf = (e) =>
  ["Books Set", e.language && (e.language === "hindi" ? "Hindi" : "Telugu"), e.stream && (e.stream === "science" ? "Science" : "Economics"), e.elective && ELECTIVE_TITLE[e.elective]]
    .filter(Boolean)
    .join(" - ");

async function main() {
  const entries = parsePriceList();
  const pool = new Pool({ connectionString: process.env.DATABASE_URI });
  const school = (await pool.query("select id from schools limit 1")).rows[0].id;
  const classes = (await pool.query("select id, label from class_levels")).rows;
  const books = (await pool.query("select b.id, b.price, b.language, b.stream, b.elective, c.label from books b join class_levels c on c.id = b.class_level_id")).rows;
  const classId = new Map(classes.map((c) => [c.label, c.id]));

  const plan = { newClasses: [], newSets: [], existing: 0, priceConflicts: [] };
  for (const e of entries) {
    if (!classId.has(e.classLabel) && !plan.newClasses.includes(e.classLabel)) plan.newClasses.push(e.classLabel);
    const found = books.find(
      (b) => b.label === e.classLabel && (b.language ?? null) === e.language && (b.stream ?? null) === e.stream && (b.elective ?? null) === e.elective,
    );
    if (found) {
      plan.existing++;
      if (Number(found.price) !== e.price) plan.priceConflicts.push(`${e.classLabel} ${titleOf(e)}: catalogue ₹${found.price} vs price list ₹${e.price}`);
    } else plan.newSets.push(e);
  }

  console.log(`Price list rows used: ${entries.length}`);
  console.log(`Already in catalogue: ${plan.existing}  ·  to create: ${plan.newSets.length}  ·  new classes: ${plan.newClasses.join(", ") || "none"}`);
  if (plan.priceConflicts.length) console.log("PRICE CONFLICTS (left untouched):\n  " + plan.priceConflicts.join("\n  "));
  for (const e of plan.newSets) console.log(`  + ${e.classLabel.padEnd(8)} ${titleOf(e).padEnd(48)} ₹${e.price}`);

  if (!APPLY) {
    console.log("\nDry run — nothing written. Re-run with --apply.");
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    for (const label of plan.newClasses) {
      const order = label in PRE_PRIMARY_ORDER ? PRE_PRIMARY_ORDER[label] : Number(label.replace("Class ", ""));
      const { rows } = await client.query(`insert into class_levels (school_id, label, board, "order") values ($1,$2,'CBSE',$3) returning id`, [school, label, order]);
      classId.set(label, rows[0].id);
    }
    for (const e of plan.newSets) {
      await client.query(
        `insert into books (school_id, class_level_id, title, subject, price, language, stream, elective) values ($1,$2,$3,'All Subjects',$4,$5,$6,$7)`,
        [school, classId.get(e.classLabel), titleOf(e), e.price, e.language, e.stream, e.elective],
      );
    }
    await client.query("commit");
    console.log(`\nCreated ${plan.newClasses.length} classes and ${plan.newSets.length} book sets.`);
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
