// HTTP routes that hand compiled wizard code to the browser.
//   GET  /api/sample-wizard   compiles a saved component (no AI call, instant)
//   POST /api/generate        asks the LLM for a new wizard, then validates and compiles it

const express = require("express");
const fs = require("fs");
const path = require("path");
const { compileWizard } = require("./security/compile");
const { generateWizard } = require("./codegen/generate");
const { loanFormSchema } = require("./codegen/loanFormSchema");

const router = express.Router();
const backendRoot = path.join(__dirname, "..");

function savedWizardFiles() {
  const files = [path.join(backendRoot, "generated", "wizard.jsx")];
  const dir = path.join(backendRoot, "results", "audit-samples");
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir)
      .filter((f) => f.endsWith(".jsx"))
      .sort()
      .forEach((f) => files.push(path.join(dir, f)));
  }
  return files.filter((f) => fs.existsSync(f));
}

router.get("/sample-wizard", (req, res) => {
  for (const file of savedWizardFiles()) {
    const result = compileWizard(fs.readFileSync(file, "utf8"));
    if (result.ok) {
      return res.json({
        ok: true,
        js: result.js,
        source: path.relative(backendRoot, file).replace(/\\/g, "/"),
      });
    }
  }
  res.status(404).json({ ok: false, error: "No valid saved wizard found. Run: node scripts/generate.js" });
});

router.post("/generate", async (req, res) => {
  const { values = {}, friction = null } = req.body || {};
  try {
    const gen = await generateWizard({ schema: loanFormSchema, values, friction });
    const result = compileWizard(gen.code);
    if (!result.ok) {
      return res.status(422).json({
        ok: false,
        error: "Generated code failed the security check",
        violations: result.violations.slice(0, 10),
      });
    }
    res.json({ ok: true, js: result.js, provider: gen.provider, model: gen.model, ms: gen.ms });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err.message || err).split("\n")[0] });
  }
});

module.exports = router;