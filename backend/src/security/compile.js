const babel = require("@babel/core");
const { validateWizard } = require("./validator");

// Removes "export default" so the result is a plain function declaration.
function stripDefaultExport() {
  return {
    visitor: {
      ExportDefaultDeclaration(path) {
        path.replaceWith(path.node.declaration);
      },
    },
  };
}

// Validates, then compiles JSX into plain JavaScript.
// Returns { ok: true, js } or { ok: false, violations }.
function compileWizard(code) {
  const check = validateWizard(code);
  if (!check.valid) return { ok: false, violations: check.violations };

  try {
    const out = babel.transformSync(code, {
      babelrc: false,
      configFile: false,
      sourceType: "module",
      comments: false,
      plugins: [stripDefaultExport],
      presets: [[require.resolve("@babel/preset-react"), { runtime: "classic" }]],
    });
    return { ok: true, js: out.code };
  } catch (err) {
    return { ok: false, violations: [{ rule: "compile", message: err.message, line: null, column: null }] };
  }
}

module.exports = { compileWizard };