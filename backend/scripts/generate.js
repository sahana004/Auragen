// Runs the pipeline once, saves the result, and does quick sanity checks.
// Usage (from the backend folder):  node scripts/generate.js

const fs = require("fs");
const path = require("path");
const { generateWizard } = require("../src/codegen/generate");
const { loanFormSchema, allFieldIds } = require("../src/codegen/loanFormSchema");

const ALLOWED = new Set(["Button", "Input", "Select", "Card", "Stepper"]);

// Pretend the user already typed some values and got stuck on the PAN field.
const values = {
  fullName: "Sahana PM",
  email: "sahana@example.com",
  pan: "ABCDE12",
};
const friction = { fieldId: "pan", errors: 4, hesitations: 3, dwellSeconds: 21 };

function sanityChecks(code) {
  const tags = [...code.matchAll(/<([A-Z][A-Za-z0-9]*)/g)].map((m) => m[1]);
  const badTags = [...new Set(tags.filter((t) => !ALLOWED.has(t)))];
  const missing = allFieldIds.filter((id) => !code.includes(id));

  return [
    ["Has a default exported Wizard function", /export\s+default\s+function\s+Wizard/.test(code)],
    ["Has no import or require statements", !/^\s*import\s/m.test(code) && !/\brequire\(/.test(code)],
    [
      "Has no network, eval or storage calls",
      !/\b(fetch|XMLHttpRequest|WebSocket|eval|localStorage|sessionStorage)\b|new Function|dangerouslySetInnerHTML/.test(code),
    ],
    [`Uses only allowed components${badTags.length ? " (found: " + badTags.join(", ") + ")" : ""}`, badTags.length === 0],
    ["Starts state from initialValues", /initialValues/.test(code)],
    [`Includes every form field${missing.length ? " (missing: " + missing.join(", ") + ")" : ""}`, missing.length === 0],
    ["Uses the Stepper component", /<Stepper/.test(code)],
  ];
}

(async () => {
  console.log("Generating wizard... (a local model can take 30-90 seconds)\n");
  try {
    const result = await generateWizard({ schema: loanFormSchema, values, friction });

    const outDir = path.join(__dirname, "..", "generated");
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, "wizard.jsx");
    fs.writeFileSync(outFile, result.code + "\n");

    console.log(`Provider: ${result.provider} (${result.model})`);
    console.log(`Time:     ${(result.ms / 1000).toFixed(1)} s`);
    console.log(`Size:     ${result.code.split("\n").length} lines`);
    console.log(`Saved:    backend/generated/wizard.jsx\n`);

    let failed = 0;
    for (const [label, ok] of sanityChecks(result.code)) {
      console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
      if (!ok) failed += 1;
    }
    console.log(
      failed
        ? `\n${failed} check(s) failed. Open generated/wizard.jsx to see why, or run again.`
        : "\nAll sanity checks passed."
    );
  } catch (err) {
    console.error("Generation failed:", err.message);
    console.error("\nHints:");
    console.error("- ECONNREFUSED: Ollama isn't running. Open the Ollama app, then run 'ollama list'.");
    console.error("- 401 or invalid key: check OPENAI_API_KEY in backend/.env.");
    console.error("- model not found: run 'ollama pull llama3.1' (or your OLLAMA_MODEL).");
    process.exit(1);
  }
})();