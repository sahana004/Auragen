// Cognitive Load Score: turns raw telemetry into one 0-100 number
// and decides when the user is frustrated enough to trigger AuraGen.

const CONFIG = {
  // How much each signal matters (adds up to 1.0)
  weights: { speed: 0.15, turns: 0.2, hesitation: 0.2, rage: 0.25, errors: 0.2 },

  // Each signal is scaled to 0..1 between "low" (calm) and "high" (very frustrated)
  ranges: {
    speed: { low: 400, high: 1500 }, // px/s, average mouse speed over 3 s
    turns: { low: 1, high: 6 }, // sharp direction changes in 3 s
    hesitation: { low: 0, high: 10000 }, // ms stuck in one field
    rage: { low: 0, high: 2 }, // rage clicks in the last 10 s
    errors: { low: 0, high: 4 }, // click errors in the last 10 s
  },

  // The score rises quickly and falls slowly, so it doesn't flicker
  smoothing: { rise: 0.5, fall: 0.15 },

  threshold: 50, // score at or above this = high friction
  sustainMs: 2000, // must stay high this long before we trigger
  cooldownMs: 30000, // after a trigger, wait this long before another
};

const LABELS = {
  speed: "fast, erratic mouse speed",
  turns: "frequent direction changes",
  hesitation: "long pauses in a field",
  rage: "rage clicks",
  errors: "repeated errors",
};

const clamp01 = (n) => Math.max(0, Math.min(1, n));
const scale = (value, { low, high }) => clamp01(((value || 0) - low) / (high - low));

// Step 1: scale each signal to 0..1 and apply its weight.
function computeBreakdown(m = {}) {
  const signals = {
    speed: scale(m.avgVelocity, CONFIG.ranges.speed),
    turns: scale(m.directionChanges, CONFIG.ranges.turns),
    hesitation: scale(m.currentHesitationMs, CONFIG.ranges.hesitation),
    rage: scale(m.rageClicksRecent, CONFIG.ranges.rage),
    errors: scale(m.clickErrorsRecent, CONFIG.ranges.errors),
  };

  const contributions = {};
  let raw = 0;
  for (const key of Object.keys(signals)) {
    contributions[key] = signals[key] * CONFIG.weights[key] * 100;
    raw += contributions[key];
  }
  return { signals, contributions, raw };
}

const levelFor = (score) => (score < 25 ? "calm" : score < 50 ? "elevated" : "high");

// Which signals pushed the score up the most
function topReasons(contributions) {
  return Object.entries(contributions)
    .filter(([, points]) => points >= 5)
    .sort((a, b) => b[1] - a[1])
    .map(([key, points]) => ({ signal: key, label: LABELS[key], points: Math.round(points) }));
}

// Which form field is causing the most trouble
function findFrictionPoint(fields = {}, activeFieldId = null) {
  let best = null;
  for (const [id, s] of Object.entries(fields)) {
    const points =
      (s.errors || 0) * 3 +
      (s.hesitations || 0) * 2 +
      Math.min((s.dwellMs || 0) / 5000, 3) +
      (id === activeFieldId ? 1 : 0);
    if (!best || points > best.points) {
      best = {
        fieldId: id,
        points: Math.round(points * 10) / 10,
        errors: s.errors || 0,
        hesitations: s.hesitations || 0,
        dwellSeconds: Math.round((s.dwellMs || 0) / 100) / 10,
      };
    }
  }
  return best && best.points > 0 ? best : null;
}

// One scorer per browser session. Call update() for every telemetry packet.
function createScorer() {
  let score = 0;
  let aboveSince = null;
  let lastTriggerAt = -Infinity;
  let triggerCount = 0;

  function update(metrics = {}, fields = {}, now = Date.now()) {
    const { signals, contributions, raw } = computeBreakdown(metrics);

    // Smoothing: rise fast, fall slowly
    const alpha = raw > score ? CONFIG.smoothing.rise : CONFIG.smoothing.fall;
    score += alpha * (raw - score);

    // Trigger logic: high for long enough, and not in cooldown
    let trigger = null;
    if (score >= CONFIG.threshold) {
      if (aboveSince === null) aboveSince = now;
      const sustained = now - aboveSince >= CONFIG.sustainMs;
      const cooledDown = now - lastTriggerAt >= CONFIG.cooldownMs;
      if (sustained && cooledDown) {
        lastTriggerAt = now;
        aboveSince = null;
        triggerCount += 1;
        trigger = {
          score: Math.round(score),
          reasons: topReasons(contributions),
          frictionPoint: findFrictionPoint(fields, metrics.activeFieldId),
          at: now,
        };
      }
    } else {
      aboveSince = null;
    }

    return {
      score: Math.round(score),
      raw: Math.round(raw),
      level: levelFor(score),
      signals,
      trigger,
    };
  }

  return { update, getScore: () => Math.round(score), getTriggerCount: () => triggerCount };
}

module.exports = { CONFIG, createScorer, computeBreakdown, findFrictionPoint };