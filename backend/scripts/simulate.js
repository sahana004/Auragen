// Telemetry check: simulates a calm user, a busy user, a confused user,
// and a user who recovers, then checks that the score behaves correctly.

const fs = require("fs");
const path = require("path");
const { createScorer, CONFIG } = require("../src/cognitiveLoad");

// Tiny seeded random generator so results are identical on every run
let seed = 42;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const int = (a, b) => Math.round(a + rand() * (b - a));

// Each profile creates one fake telemetry packet (like the real hook sends)
const PROFILES = {
  calm: () => ({
    avgVelocity: int(100, 350),
    directionChanges: int(0, 1),
    currentHesitationMs: 0,
    rageClicksRecent: 0,
    clickErrorsRecent: 0,
    activeFieldId: "fullName",
  }),
  busy: () => ({
    avgVelocity: int(500, 900),
    directionChanges: int(1, 2),
    currentHesitationMs: rand() < 0.2 ? int(3000, 4500) : 0,
    rageClicksRecent: 0,
    clickErrorsRecent: int(0, 1),
    activeFieldId: "monthlyIncome",
  }),
  confused: () => ({
    avgVelocity: int(1200, 1800),
    directionChanges: int(4, 7),
    currentHesitationMs: rand() < 0.4 ? int(3000, 7000) : 0,
    rageClicksRecent: int(1, 2),
    clickErrorsRecent: int(2, 5),
    activeFieldId: "pan",
  }),
};

const FIELDS = {
  fullName: { dwellMs: 4000, hesitations: 0, errors: 0 },
  pan: { dwellMs: 21000, hesitations: 3, errors: 4 },
  email: { dwellMs: 6000, hesitations: 0, errors: 1 },
};

const PHASES = [
  { name: "calm", profile: "calm", ticks: 20 },
  { name: "busy", profile: "busy", ticks: 20 },
  { name: "confused", profile: "confused", ticks: 20 },
  { name: "recovery", profile: "calm", ticks: 20 },
];

const TICK_MS = 500; // the browser sends data every 0.5 s
const scorer = createScorer();
let now = 0;
const phaseResults = [];

console.log(`Threshold: ${CONFIG.threshold} | sustain: ${CONFIG.sustainMs} ms | cooldown: ${CONFIG.cooldownMs} ms\n`);

for (const phase of PHASES) {
  const scores = [];
  let triggers = 0;
  console.log(`--- ${phase.name.toUpperCase()} ---`);

  for (let i = 0; i < phase.ticks; i++) {
    now += TICK_MS;
    const result = scorer.update(PROFILES[phase.profile](), FIELDS, now);
    scores.push(result.score);

    let line = `t=${String(now / 1000).padStart(5)}s  score=${String(result.score).padStart(3)}  ${"#".repeat(
      Math.round(result.score / 4)
    )}`;
    if (result.trigger) {
      triggers += 1;
      const why = result.trigger.reasons.map((r) => r.label).join(", ");
      const field = result.trigger.frictionPoint ? result.trigger.frictionPoint.fieldId : "unknown";
      line += `   <-- TRIGGER (field: ${field}; reasons: ${why})`;
    }
    console.log(line);
  }

  phaseResults.push({
    phase: phase.name,
    min: Math.min(...scores),
    avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    max: Math.max(...scores),
    final: scores[scores.length - 1],
    triggers,
  });
  console.log("");
}

console.log("Summary");
console.table(phaseResults);

// ---------- pass / fail checks ----------
const by = Object.fromEntries(phaseResults.map((p) => [p.phase, p]));
const checks = [
  ["Calm user stays low (max < 25)", by.calm.max < 25],
  ["Calm user never triggers", by.calm.triggers === 0],
  ["Busy user stays below threshold", by.busy.max < CONFIG.threshold],
  ["Busy user never triggers", by.busy.triggers === 0],
  ["Confused user crosses threshold", by.confused.max >= CONFIG.threshold],
  ["Confused user triggers exactly once (cooldown works)", by.confused.triggers === 1],
  ["Confused average is far higher than busy average", by.confused.avg >= by.busy.avg * 2],
  ["Score falls back after recovery (final < 25)", by.recovery.final < 25],
  ["No trigger during recovery", by.recovery.triggers === 0],
];

console.log("\nChecks");
let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed += 1;
}

// Save the results as evidence for your report
const outDir = path.join(__dirname, "..", "results");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "telemetry-check.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      config: CONFIG,
      phases: phaseResults,
      checks: checks.map(([label, ok]) => ({ label, passed: ok })),
    },
    null,
    2
  )
);
console.log(`\nSaved: backend/results/telemetry-check.json`);

process.exit(failed ? 1 : 0);