// Imports what is inside each book set from the school's Excel lists
// (School-Bookset-All-Subjects/*.xlsx) into books_contents, and copies it onto
// orders already placed for those sets (orders_items_parts).
//
//   node scripts/import-bookset-contents.mjs            # dry run: shows what would happen
//   node scripts/import-bookset-contents.mjs --apply    # writes to the database
//
// Safe to re-run: a set's list is replaced with the file's, and an order line
// that already has a list is never touched. Files whose class / language /
// specialization has no matching book set in the Catalogue Manager are reported
// and skipped (create the set there, then run this again).
import { randomBytes } from "node:crypto";
import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
const { Pool } = require("pg");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
require("dotenv").config({ path: path.join(root, ".env"), quiet: true });

const DIR = path.join(root, "School-Bookset-All-Subjects");
const APPLY = process.argv.includes("--apply");

const clean = (v) => (v == null ? "" : String(v).replace(/\s+/g, " ").trim());
const qtyOf = (v) => {
  const n = parseFloat(clean(v));
  return Number.isFinite(n) && n > 0 ? n : 1;
};

/** "Grade-9 Text & Note Books List -Economics - ( Lang Hindi with ENA).xlsx" -> {classLabel, language, stream, elective} */
function describeFile(file) {
  const n = file.toLowerCase();
  let classLabel = null;
  const grade = n.match(/^grade-(\d+)/);
  if (grade) classLabel = `Class ${grade[1]}`;
  else if (n.startsWith("nursery")) classLabel = "Nursery";
  else if (n.startsWith("lkg")) classLabel = "LKG";
  else if (n.startsWith("ukg")) classLabel = "UKG";
  const language = /hindi/.test(n) ? "hindi" : /telugu/.test(n) ? "telugu" : null;
  const stream = /economics/.test(n) ? "economics" : /science/.test(n) ? "science" : null;
  const elective = /\bena\b/.test(n) ? "ena" : /home science/.test(n) ? "homeScience" : /robotics/.test(n) ? "roboticsAI" : null;
  return { classLabel, language, stream, elective };
}

/** Reads one workbook into [{section, subject, name, publisher, detail, quantity, starred}]. */
function parseWorkbook(file) {
  const wb = XLSX.readFile(path.join(DIR, file));
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, blankrows: false });
  const items = [];
  let mode = null;
  let subjectCarry = "";

  for (const row of rows) {
    const c = row.map(clean);
    // --- section headers
    if (c[0] === "Subtitle" && c[1] === "S.No") {
      mode = { kind: "textbook", layout: "nature", subject: 0, name: 2, publisher: 4, qty: 3 };
      subjectCarry = "";
      continue;
    }
    // (one file has a blank-looking "S.No" cell on the stationery header — match on the heading text too)
    if (c[0] === "S.No" || (c[0] === "" && /^stationery$/i.test(c[1]) && /type of book/i.test(c[2]))) {
      if (/name of the book/i.test(c[2])) {
        mode = { kind: "textbook", layout: "senior", subject: 1, name: 2, publisher: 3, qty: 4 };
        subjectCarry = "";
      } else if (/note ?book/i.test(c[1]) || /note ?book/i.test(c[2])) {
        mode = { kind: "notebook", name: 1, detail: 2, qty: 3 };
      } else if (/subtitle|stationery/i.test(c[1])) {
        mode = { kind: "stationery", name: 1, detail: 2, qty: 3 };
      } else mode = null;
      continue;
    }
    // --- end of list
    if (c.some((x) => /^total\s*:?$/i.test(x) || /^please note/i.test(x) || /^student name/i.test(x))) {
      mode = null;
      continue;
    }
    if (!mode) continue;

    const sno = clean(row[0]);
    const starred = sno.endsWith("*");

    if (mode.kind === "textbook") {
      let subject = c[mode.subject];
      if (subject) subjectCarry = subject;
      else subject = subjectCarry;
      let name = c[mode.name];
      let publisher = c[mode.publisher];
      let detail = "";
      if (!name || /^no text book/i.test(name)) continue;
      if (/^only for text books/i.test(name)) name = "Book covers (for the textbooks)";
      if (/amount will be/i.test(publisher)) {
        detail = "Amount is collected after the book arrives";
        publisher = "";
      }
      if (/^new book$/i.test(name)) name = `${subject} – new book`;
      if (/^[-–—]+$/.test(publisher)) publisher = "";
      items.push({ section: "textbook", subject, name, publisher, detail, quantity: qtyOf(row[mode.qty]), starred });
    } else if (mode.kind === "notebook") {
      const name = c[mode.name];
      if (!name) continue;
      items.push({ section: "notebook", subject: "", name, publisher: "", detail: c[mode.detail], quantity: qtyOf(row[mode.qty]), starred });
    } else {
      const parts = [c[mode.name], c[mode.detail]].filter(Boolean);
      if (parts.length === 0) continue;
      items.push({ section: "stationery", subject: "", name: parts.join(" – "), publisher: "", detail: "", quantity: qtyOf(row[mode.qty]), starred });
    }
  }
  return items;
}

/**
 * Cross-checks what the sheet itself says (grade, language, group, elective in
 * its heading) against what the file NAME says, so a mis-named file can never be
 * imported into the wrong book set. Returns a list of disagreements.
 */
function headerProblems(file, d) {
  const wb = XLSX.readFile(path.join(DIR, file));
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, blankrows: false });
  const head = rows.slice(0, 8).map((r) => r.map(clean).join(" ")).join(" | ").toLowerCase();
  const problems = [];
  const grade = head.match(/(?:grade|class)\s*[–-]\s*(\d+)/);
  if (d.classLabel.startsWith("Class ")) {
    if (!grade || `Class ${grade[1]}` !== d.classLabel) problems.push(`heading says "${grade ? "Class " + grade[1] : "no class"}", file name says "${d.classLabel}"`);
  } else if (!new RegExp("\\b" + d.classLabel.toLowerCase() + "\\b").test(head)) problems.push(`heading doesn't mention ${d.classLabel}`);
  const langs = ["hindi", "telugu"].filter((l) => head.includes(l));
  if (d.language) {
    if (langs.length !== 1 || langs[0] !== d.language) problems.push(`heading language [${langs.join(",") || "none"}] ≠ file name "${d.language}"`);
  } else if (langs.length) problems.push(`heading mentions ${langs.join(",")} but file name has no language`);
  const streams = ["science", "economics"].filter((x) => head.includes(x + " group"));
  if (d.stream) {
    if (streams.length !== 1 || streams[0] !== d.stream) problems.push(`heading group [${streams.join(",") || "none"}] ≠ file name "${d.stream}"`);
  } else if (streams.length) problems.push(`heading mentions ${streams.join(",")} group but file name has none`);
  const els = [["ena", /with ena/], ["homeScience", /with home science/], ["roboticsAI", /with robotics/]].filter(([, re]) => re.test(head)).map(([k]) => k);
  if (d.elective) {
    if (els.length !== 1 || els[0] !== d.elective) problems.push(`heading elective [${els.join(",") || "none"}] ≠ file name "${d.elective}"`);
  } else if (els.length) problems.push(`heading mentions elective ${els.join(",")} but file name has none`);
  return problems;
}

const newId = () => randomBytes(12).toString("hex");

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URI });
  const { rows: books } = await pool.query(
    `select b.id, b.title, b.language, b.stream, b.elective, c.label as class_label
       from books b join class_levels c on c.id = b.class_level_id`,
  );

  const files = readdirSync(DIR).filter((f) => f.toLowerCase().endsWith(".xlsx") && !f.startsWith("~$")).sort();
  const matched = [];
  const unmatched = [];
  for (const file of files) {
    const d = describeFile(file);
    const items = parseWorkbook(file);
    const hits = books.filter(
      (b) =>
        b.class_label === d.classLabel &&
        (b.language ?? null) === d.language &&
        (b.stream ?? null) === d.stream &&
        (b.elective ?? null) === d.elective,
    );
    const problems = hits.length === 1 ? headerProblems(file, d) : [];
    if (problems.length) unmatched.push({ file, reason: "HEADING DISAGREES WITH FILE NAME: " + problems.join("; "), d, count: items.length });
    else if (hits.length === 1) matched.push({ file, book: hits[0], items });
    else unmatched.push({ file, reason: hits.length === 0 ? "no matching book set in the catalogue" : "more than one matching book set", d, count: items.length });
  }

  const seen = new Set();
  for (const m of matched) {
    if (seen.has(m.book.id)) throw new Error(`Two files map to the same book set: ${m.book.class_label} ${m.book.title}`);
    seen.add(m.book.id);
  }
  console.log(`\n${files.length} files · ${matched.length} match a book set · ${unmatched.length} skipped\n`);
  for (const m of matched) {
    const by = (s) => m.items.filter((i) => i.section === s).length;
    console.log(`✔ ${m.book.class_label} · ${m.book.title}  ←  ${m.file}\n    ${m.items.length} items (${by("textbook")} textbooks, ${by("notebook")} notebooks, ${by("stationery")} stationery, ${m.items.filter((i) => i.starred).length} given in class)`);
    if (m.items.length === 0) console.log("    ⚠ nothing was read from this file");
  }
  const byClass = {};
  for (const u of unmatched) (byClass[u.d.classLabel ?? "?"] ??= []).push(u);
  for (const [cls, list] of Object.entries(byClass)) console.log(`– skipped ${list.length} file(s) for ${cls}: ${list[0].reason}`);

  if (process.argv.includes("--verbose")) { for (const u of unmatched) console.log("  ", u.count, u.file); }
  if (!APPLY) {
    console.log("\nDry run — nothing written. Re-run with --apply to import.");
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
    for (const m of matched) {
      if (m.items.length === 0) continue;
      if (only && !m.file.includes(only)) continue;
      await client.query("delete from books_contents where _parent_id = $1", [m.book.id]);
      let order = 0;
      for (const it of m.items) {
        await client.query(
          `insert into books_contents (_order, _parent_id, id, section, subject, name, publisher, detail, quantity, starred)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [order++, m.book.id, newId(), it.section, it.subject || null, it.name, it.publisher || null, it.detail || null, it.quantity, it.starred],
        );
      }
    }

    // Orders already placed for these sets get the same list (once).
    const { rows: lines } = await client.query(
      `select oi.id, oi.ref_id, oi.collected_at
         from orders_items oi
        where oi.kind = 'book'
          and not exists (select 1 from orders_items_parts p where p._parent_id = oi.id)
          and exists (select 1 from books_contents bc where bc._parent_id::text = oi.ref_id)`,
    );
    let copied = 0;
    for (const line of lines) {
      const { rows: contents } = await client.query("select * from books_contents where _parent_id::text = $1 order by _order", [line.ref_id]);
      let order = 0;
      for (const c of contents) {
        await client.query(
          `insert into orders_items_parts (_order, _parent_id, id, section, subject, name, publisher, detail, quantity, starred, collected_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [order++, line.id, newId(), c.section, c.subject, c.name, c.publisher, c.detail, c.quantity, c.starred, line.collected_at],
        );
      }
      copied++;
    }
    await client.query("commit");
    console.log(`\nImported ${matched.length} book sets. Copied the list onto ${copied} existing order line(s).`);
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
