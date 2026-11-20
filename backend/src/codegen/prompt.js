// Builds the messages sent to the LLM: system rules, one worked example (few-shot), then the real task.

const { designSystem } = require("./designSystem");

function buildSystemPrompt() {
  return [
    "You are AuraGen's UI generation agent for the Infotact financial portal.",
    "A user is struggling with a long, complex form. Rebuild it as a friendly step-by-step wizard.",
    "",
    "OUTPUT CONTRACT (follow exactly):",
    "1. Output ONLY raw React JSX code. No markdown fences, no explanations, no comments outside the code.",
    "2. Define exactly one component: export default function Wizard({ initialValues, onSubmit }) { ... }",
    "3. Do NOT write any import or require statements. React, useState, useEffect, Button, Input, Select, Card and Stepper are already in scope.",
    "4. Use only the components in the design system below, plus plain div, p, span, h1, h2, h3, label elements, a native textarea for textarea fields and a native checkbox input for checkbox fields.",
    "5. Style only with Tailwind utility classes that follow the design tokens.",
    "6. Never use fetch, XMLHttpRequest, WebSocket, eval, new Function, localStorage, sessionStorage, dangerouslySetInnerHTML or dynamic import().",
    "",
    "BEHAVIOUR RULES:",
    "- Initialise state from initialValues so everything the user already typed is kept: useState({ ...initialValues }).",
    "- Include EVERY field from the schema, using its exact id as the key in state.",
    "- Group fields into 3 to 5 steps with at most 3 or 4 fields each. Give each step a short friendly title and subtitle.",
    "- ALWAYS render the Stepper component at the top of every step: <Stepper steps={stepTitles} current={step} />. Never build your own progress indicator. A wizard without the Stepper component is INVALID.",
    "- Validate the current step's fields before moving on, using the schema's required flags and validation hints. Show messages through the error prop.",
    "- Back and Next buttons on every step. The last step has a submit button that calls onSubmit(values).",
    "- Put the step containing the friction-point field FIRST or make it clearly prominent, and add a short helpful hint for that field (use the hint prop on Input).",
    "- Validate numbers against min and max where given. Never invent fields that are not in the schema.",
    "",
    "DESIGN SYSTEM (JSON):",
    JSON.stringify(designSystem),
    "",
    "FINAL CHECK before you answer: (1) the code contains <Stepper steps={...} current={step} /> exactly as in the design system, (2) there are no import statements, (3) every schema field id appears in the code, (4) only the allowed components are used.",
  ].join("\n");
    
}

// ---------- the worked example (few-shot) ----------

const EXAMPLE_SCHEMA = {
  formId: "mini-demo",
  title: "Mini application",
  sections: [
    {
      id: "main",
      title: "Details",
      fields: [
        { id: "fullName", label: "Full name", type: "text", required: true },
        { id: "email", label: "Email address", type: "email", required: true, validation: "valid email format" },
        { id: "loanType", label: "Loan type", type: "select", required: true, options: ["Home loan", "Car loan"] },
      ],
    },
  ],
};

const EXAMPLE_VALUES = { fullName: "Asha", email: "", loanType: "" };
const EXAMPLE_FRICTION = { fieldId: "email", errors: 3, hesitations: 1, dwellSeconds: 12 };

// String.raw keeps backslashes (like \s in the regex) exactly as written.
const EXAMPLE_COMPONENT = String.raw`export default function Wizard({ initialValues, onSubmit }) {
  const [values, setValues] = useState({ ...initialValues });
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(0);

  const steps = [
    { title: "Your email", subtitle: "We only use it to send your application status", fields: ["email"] },
    { title: "About you", subtitle: "Just a couple more details", fields: ["fullName", "loanType"] },
  ];

  const set = (id, value) => {
    setValues((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => ({ ...prev, [id]: "" }));
  };

  const validate = (ids) => {
    const next = {};
    ids.forEach((id) => {
      if (!String(values[id] || "").trim()) next[id] = "This field is required";
    });
    if (ids.includes("email") && values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      next.email = "Enter a valid email address, for example name@example.com";
    }
    setErrors((prev) => ({ ...prev, ...next }));
    return Object.keys(next).length === 0;
  };

  const current = steps[step];
  const isLast = step === steps.length - 1;

  const goNext = () => {
    if (!validate(current.fields)) return;
    if (isLast) onSubmit(values);
    else setStep(step + 1);
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 p-4">
      <Stepper steps={steps.map((s) => s.title)} current={step} />
      <Card title={current.title} subtitle={current.subtitle}>
        <div className="space-y-4">
          {current.fields.includes("email") && (
            <Input
              id="email"
              label="Email address"
              type="email"
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
              error={errors.email}
              hint="Example: name@example.com"
              required
            />
          )}
          {current.fields.includes("fullName") && (
            <Input
              id="fullName"
              label="Full name"
              value={values.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              error={errors.fullName}
              required
            />
          )}
          {current.fields.includes("loanType") && (
            <Select
              id="loanType"
              label="Loan type"
              options={["Home loan", "Car loan"]}
              value={values.loanType}
              onChange={(e) => set("loanType", e.target.value)}
              error={errors.loanType}
              required
            />
          )}
        </div>
      </Card>
      <div className="flex justify-between">
        <Button variant="secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>
          Back
        </Button>
        <Button variant="primary" onClick={goNext}>
          {isLast ? "Submit" : "Next"}
        </Button>
      </div>
    </div>
  );
}`;

function buildUserPrompt({ schema, values, friction }) {
  return [
    "Generate the wizard component for this form.",
    "REQUIRED: keep an array named steps (each item { title, subtitle, fields }) and a state variable named step. The returned JSX must start with exactly: <Stepper steps={steps.map((s) => s.title)} current={step} />",
    "",
    "FORM SCHEMA (JSON):",
    JSON.stringify(schema),
    "",
    "VALUES THE USER HAS ALREADY TYPED (must be preserved):",
    JSON.stringify(values),
    "",
    "FRICTION POINT (the field the user struggled with most):",
    friction ? JSON.stringify(friction) : "unknown",
    "",
    "Remember: output only the component code, nothing else. The component MUST render <Stepper ... /> from the design system.",
  ].join("\n");
}

function buildMessages(input) {
  return [
    ["system", buildSystemPrompt()],
    ["human", buildUserPrompt({ schema: EXAMPLE_SCHEMA, values: EXAMPLE_VALUES, friction: EXAMPLE_FRICTION })],
    ["ai", EXAMPLE_COMPONENT],
    ["human", buildUserPrompt(input)],
  ];
}

module.exports = { buildMessages, buildSystemPrompt, buildUserPrompt };