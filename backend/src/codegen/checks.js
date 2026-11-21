// Quality checks for a generated wizard component.
// Used by the audit now, and reusable by the security validator later.

const parser = require("@babel/parser");

const ALLOWED_COMPONENTS = new Set(["Button", "Input", "Select", "Card", "Stepper"]);

const FORBIDDEN =
  /\b(fetch|XMLHttpRequest|WebSocket|eval|localStorage|sessionStorage)\b|new Function|dangerouslySetInnerHTML|import\(/;

// Does the code mention this field id as a prop value, object key or property?
const mentionsField = (code, id) =>
  new RegExp(`(["'\`.])${id}\\b|\\b${id}\\s*:`).test(code);

function parses(code) {
  try {
    parser.parse(code, { sourceType: "module", plugins: ["jsx"] });
    return { ok: true };
  } catch (err) {
    return { ok: false, detail: err.message };
  }
}

// Returns [{ id, label, ok, detail? }]
function runChecks(code, allFieldIds) {
  const syntax = parses(code);

  const tags = [...code.matchAll(/<([A-Z][A-Za-z0-9]*)/g)].map((m) => m[1]);
  const badTags = [...new Set(tags.filter((t) => !ALLOWED_COMPONENTS.has(t)))];
  const missing = allFieldIds.filter((id) => !mentionsField(code, id));

  return [
    { id: "syntax", label: "Parses as valid JSX", ok: syntax.ok, detail: syntax.detail },
    { id: "export", label: "Default-exports a Wizard function", ok: /export\s+default\s+function\s+Wizard/.test(code) },
    { id: "imports", label: "Has no import or require", ok: !/^\s*import\s/m.test(code) && !/\brequire\(/.test(code) },
    { id: "forbidden", label: "No network, eval or storage calls", ok: !FORBIDDEN.test(code) },
    { id: "components", label: "Uses only allowed components", ok: badTags.length === 0, detail: badTags.join(", ") },
    { id: "initial", label: "Starts state from initialValues", ok: /initialValues/.test(code) },
    { id: "fields", label: "Includes every form field", ok: missing.length === 0, detail: missing.join(", ") },
    { id: "stepper", label: "Uses the Stepper component", ok: /<Stepper/.test(code) },
    { id: "submit", label: "Calls onSubmit", ok: /onSubmit\s*\(/.test(code) },
    { id: "nav", label: "Has Back and Next buttons", ok: /Back/.test(code) && /Next/.test(code) },
    { id: "hint", label: "Adds a hint for the friction field", ok: /hint\s*=/.test(code) },
  ];
}

module.exports = { runChecks, ALLOWED_COMPONENTS };