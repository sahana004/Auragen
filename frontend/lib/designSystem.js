// Design system spec for AuraGen.
// This object is sent to the LLM so it can only generate UI
// from these approved components and Tailwind conventions.

export const designSystem = {
  name: "Infotact Portal Design System",
  framework: "React functional components with Tailwind CSS utility classes",

  tokens: {
    primary: "blue-600 (hover: blue-700)",
    success: "green-600",
    danger: "red-600",
    text: "gray-900 headings, gray-800 labels, gray-500 hints",
    border: "gray-200 cards, gray-300 inputs",
    radius: "rounded-lg for controls, rounded-xl for cards",
    spacing: "gap-4 inside groups, space-y-6 between sections",
  },

  allowedComponents: {
    Button: {
      props: {
        variant: "primary | secondary | ghost | danger",
        size: "sm | md | lg",
        type: "button | submit",
        disabled: "boolean",
        onClick: "function",
      },
      example: '<Button variant="primary" onClick={next}>Next</Button>',
    },
    Input: {
      props: {
        id: "string (required)",
        label: "string",
        type: "text | email | tel | number | date",
        value: "string",
        onChange: "function(event)",
        placeholder: "string",
        error: "string",
        required: "boolean",
        hint: "string",
      },
      example:
        '<Input id="fullName" label="Full name" value={v.fullName} onChange={(e) => set("fullName", e.target.value)} required />',
    },
    Select: {
      props: {
        id: "string (required)",
        label: "string",
        value: "string",
        onChange: "function(event)",
        options: "array of strings",
        error: "string",
        required: "boolean",
      },
      example:
        '<Select id="loanType" label="Loan type" options={["Personal loan", "Home loan"]} value={v.loanType} onChange={(e) => set("loanType", e.target.value)} />',
    },
    Card: {
      props: { title: "string", subtitle: "string", children: "nodes" },
      example: '<Card title="Personal details">...</Card>',
    },
    Stepper: {
      props: { steps: "array of step label strings", current: "zero-based index" },
      example: '<Stepper steps={["Personal", "Income", "Loan"]} current={0} />',
    },
  },

  rules: [
    "Output a single React functional component with a default export.",
    "Use only the allowed components listed above plus plain div, p, h1-h3 and span elements.",
    "Style only with Tailwind utility classes.",
    "Do not use fetch, XMLHttpRequest, WebSocket, eval, localStorage or dangerouslySetInnerHTML.",
    "Do not import anything except React hooks (useState, useEffect).",
    "Keep the user's existing field values: initialise state from the provided values.",
    "Show one question or small group of fields per step, with Back and Next buttons.",
  ],
};