// Runs the security validator and compiler on every generated component we have.
// Usage (from the backend folder):  node scripts/validateSamples.js

const fs = require("fs");
const path = require("path");
const { validateWizard } = require("../src/security/validator");
const { compileWizard } = require("../src/security/compile");

const root = path.join(__dirname, "..");
const dirs = [path.join(root, "results", "audit-samples"), path.join(root, "generated")];

const files = [];
for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) if (f.endsWith(".jsx")) files.push(path.join(dir, f));
}

if (!files.length) {
  console.log("No .jsx files found. Run the audit or generate.js first.");
  process.exit(1);
}

const rows = [];
const details = [];

for (const file of files) {
  const code = fs.readFileSync(file, "utf8");
  const check = validateWizard(code);
  const compiled = check.valid ? compileWizard(code) : null;
  const rel = path.relative(root, file).replace(/\\/g, "/");

  rows.push({
    file: rel,
    lines: code.split("\n").length,
    safe: check.valid ? "YES" : "NO",
    compiled: compiled ? (compiled.ok ? "YES" : "NO") : "-",
    problems: check.violations.length,
  });
  if (!check.valid) details.push({ file: rel, violations: check.violations });
}

console.table(rows);

details.forEach((d) => {
  console.log(`\n${d.file}`);
  d.violations.slice(0, 6).forEach((v) => console.log(`  [${v.rule}] line ${v.line}: ${v.message}`));
  if (d.violations.length > 6) console.log(`  ... and ${d.violations.length - 6} more`);
});

const safe = rows.filter((r) => r.safe === "YES").length;
console.log(`\n${safe}/${rows.length} files passed the security validator.`);

fs.mkdirSync(path.join(root, "results"), { recursive: true });
fs.writeFileSync(
  path.join(root, "results", "validator-report.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), safe, total: rows.length, rows, details }, null, 2)
);
console.log("Saved: backend/results/validator-report.json");