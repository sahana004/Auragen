// Generation audit: runs the code-gen pipeline on 10 different scenarios,
// checks every output, and saves a report.
//
// Usage (from the backend folder):
//   node scripts/audit.js        runs all 10 scenarios
//   node scripts/audit.js 3      runs only the first 3 (quick test)

const fs = require("fs");
const path = require("path");
const { generateWizard } = require("../src/codegen/generate");
const { loanFormSchema, allFieldIds } = require("../src/codegen/loanFormSchema");
const { runChecks } = require("../src/codegen/checks");

const SCENARIOS = [
  { name: "PAN format errors", values: { fullName: "Sahana PM", email: "sahana@example.com", pan: "ABCDE12" }, friction: { fieldId: "pan", errors: 4, hesitations: 3, dwellSeconds: 21 } },
  { name: "Invalid email", values: { fullName: "Ravi Kumar", email: "ravi@" }, friction: { fieldId: "email", errors: 3, hesitations: 1, dwellSeconds: 14 } },
  { name: "Date of birth confusion", values: { fullName: "Meera Nair", email: "meera@example.com", phone: "9876543210" }, friction: { fieldId: "dob", errors: 2, hesitations: 2, dwellSeconds: 18 } },
  { name: "Monthly income unsure", values: { fullName: "Arjun Rao", employmentType: "Salaried", employerName: "Acme Ltd" }, friction: { fieldId: "monthlyIncome", errors: 0, hesitations: 4, dwellSeconds: 30 } },
  { name: "Loan amount out of range", values: { fullName: "Divya S", loanType: "Home loan", loanAmount: "5" }, friction: { fieldId: "loanAmount", errors: 3, hesitations: 1, dwellSeconds: 12 } },
  { name: "Phone number errors", values: { fullName: "Kiran Patel", email: "kiran@example.com", phone: "12345" }, friction: { fieldId: "phone", errors: 4, hesitations: 0, dwellSeconds: 9 } },
  { name: "Employer name hesitation", values: { fullName: "Anita Das", employmentType: "Self-employed" }, friction: { fieldId: "employerName", errors: 0, hesitations: 3, dwellSeconds: 25 } },
  { name: "Existing EMI confusion", values: { fullName: "Vikram Singh", monthlyIncome: "60000", monthlyExpenses: "25000" }, friction: { fieldId: "existingEmi", errors: 1, hesitations: 4, dwellSeconds: 28 } },
  { name: "Address textarea", values: { fullName: "Lata Menon", email: "lata@example.com", pan: "ABCDE1234F" }, friction: { fieldId: "address", errors: 2, hesitations: 2, dwellSeconds: 16 } },
  { name: "Tenure dropdown", values: { fullName: "Rohan Jain", loanType: "Car loan", loanAmount: "500000" }, friction: { fieldId: "tenure", errors: 0, hesitations: 3, dwellSeconds: 20 } },
];

const RUNS = Math.min(Number(process.argv[2]) || SCENARIOS.length, SCENARIOS.length);
const GAP_SEC = Number(process.env.AUDIT_GAP_SEC) || 65; // the free Groq tier allows about 1 request per minute

const resultsDir = path.join(__dirname, "..", "results");
const samplesDir = path.join(resultsDir, "audit-samples");
fs.mkdirSync(samplesDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);

function writeReports(meta, runs) {
  const done = runs.length;
  const passed = runs.filter((r) => r.valid).length;
  const okRuns = runs.filter((r) => r.checks);
  const avg = (key) =>
    okRuns.length ? Math.round((okRuns.reduce((s, r) => s + r[key], 0) / okRuns.length) * 10) / 10 : 0;

  // pass rate for every individual check
  const perCheck = {};
  okRuns.forEach((r) =>
    r.checks.forEach((c) => {
      perCheck[c.id] = perCheck[c.id] || { label: c.label, passed: 0, total: 0 };
      perCheck[c.id].total += 1;
      if (c.ok) perCheck[c.id].passed += 1;
    })
  );

  const summary = {
    ...meta,
    runsCompleted: done,
    fullyValid: passed,
    validRatePercent: pct(passed, done),
    errors: runs.filter((r) => r.error).length,
    avgSeconds: avg("seconds"),
    avgLines: avg("lines"),
    perCheck,
    runs,
  };
  fs.writeFileSync(path.join(resultsDir, "generation-audit.json"), JSON.stringify(summary, null, 2));

  const md = [
    "# Generation audit",
    "",
    `- Date: ${meta.date}`,
    `- Model: ${meta.provider} / ${meta.model}`,
    `- Runs: ${done}  |  Fully valid: ${passed}  (${summary.validRatePercent}%)`,
    `- Generation errors: ${summary.errors}`,
    `- Average time: ${summary.avgSeconds} s  |  Average size: ${summary.avgLines} lines`,
    "",
    "## Per-check pass rate",
    "",
    "| Check | Passed | Rate |",
    "|---|---|---|",
    ...Object.values(perCheck).map((c) => `| ${c.label} | ${c.passed}/${c.total} | ${pct(c.passed, c.total)}% |`),
    "",
    "## Runs",
    "",
    "| # | Scenario | Result | Time | Lines | Failed checks |",
    "|---|---|---|---|---|---|",
    ...runs.map(
      (r) =>
        `| ${r.run} | ${r.scenario} | ${r.error ? "ERROR" : r.valid ? "PASS" : "FAIL"} | ${r.seconds ?? "-"} s | ${r.lines ?? "-"} | ${
          r.error ? r.error : r.failed.length ? r.failed.join("; ") : "none"
        } |`
    ),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(resultsDir, "generation-audit.md"), md);

  return summary;
}

(async () => {
  const runs = [];
  let meta = { date: new Date().toISOString().slice(0, 10), provider: "?", model: "?" };

  console.log(`Generation audit: ${RUNS} runs, ${GAP_SEC}s pause between runs (about ${Math.ceil((RUNS * (GAP_SEC + 8)) / 60)} minutes).`);
  console.log("Leave this window open. Results are saved after every run.\n");

  for (let i = 0; i < RUNS; i++) {
    const sc = SCENARIOS[i];
    const label = `Run ${String(i + 1).padStart(2)}/${RUNS} [${sc.friction.fieldId}] ${sc.name}`;
    try {
      const result = await generateWizard({ schema: loanFormSchema, values: sc.values, friction: sc.friction });
      meta = { ...meta, provider: result.provider, model: result.model };

      const checks = runChecks(result.code, allFieldIds);
      const failed = checks.filter((c) => !c.ok).map((c) => (c.detail ? `${c.label} (${c.detail})` : c.label));
      const lines = result.code.split("\n").length;
      const valid = failed.length === 0;

      fs.writeFileSync(path.join(samplesDir, `run-${String(i + 1).padStart(2, "0")}.jsx`), result.code + "\n");
      runs.push({
        run: i + 1,
        scenario: sc.name,
        frictionField: sc.friction.fieldId,
        valid,
        seconds: Math.round(result.ms / 100) / 10,
        lines,
        attempts: result.attempts,
        failed,
        checks: checks.map((c) => ({ id: c.id, label: c.label, ok: c.ok })),
      });

      console.log(`${label}\n   ${valid ? "PASS" : "FAIL"}  ${checks.filter((c) => c.ok).length}/${checks.length} checks, ${(result.ms / 1000).toFixed(1)}s, ${lines} lines`);
      if (!valid) failed.forEach((f) => console.log(`   - ${f}`));
    } catch (err) {
      const msg = String(err.message || err).split("\n")[0].slice(0, 120);
      runs.push({ run: i + 1, scenario: sc.name, frictionField: sc.friction.fieldId, valid: false, error: msg, failed: [] });
      console.log(`${label}\n   ERROR  ${msg}`);
    }

    writeReports(meta, runs);
    if (i < RUNS - 1) {
      process.stdout.write(`   (waiting ${GAP_SEC}s for the rate limit...)\n`);
      await sleep(GAP_SEC * 1000);
    }
  }

  const s = writeReports(meta, runs);
  console.log("\n================ SUMMARY ================");
  console.log(`Fully valid: ${s.fullyValid}/${s.runsCompleted} (${s.validRatePercent}%)   Errors: ${s.errors}`);
  console.log(`Average time: ${s.avgSeconds}s   Average size: ${s.avgLines} lines\n`);
  Object.values(s.perCheck).forEach((c) =>
    console.log(`${String(pct(c.passed, c.total)).padStart(3)}%  ${c.label}  (${c.passed}/${c.total})`)
  );
  console.log("\nSaved: backend/results/generation-audit.md and generation-audit.json");
  console.log("Samples: backend/results/audit-samples/run-XX.jsx");
})();