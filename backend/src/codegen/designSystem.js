// The design system the LLM must follow (backend copy of the frontend spec).

const designSystem = {
  name: "Infotact Portal Design System",
  framework: "React functional component styled with Tailwind CSS utility classes",

  tokens: {
    primary: "blue-600 (hover: blue-700)",
    success: "green-600",
    danger: "red-600",
    text: "gray-900 headings, gray-800 labels, gray-500 hints",
    border: "gray-200 cards, gray-300 inputs",
    radius: "rounded-lg for controls, rounded-xl for cards",
    spacing: "space-y-4 inside a card, space-y-6 between blocks",
  },

  components: {
    Button: {
      props: {
        variant: "primary | secondary | ghost | danger",
        size: "sm | md | lg",
        type: "button | submit",
        disabled: "boolean",
        onClick: "function",
      },
      example: '<Button variant="primary" onClick={goNext}>Next</Button>',
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
        '<Input id="fullName" label="Full name" value={values.fullName} onChange={(e) => set("fullName", e.target.value)} error={errors.fullName} required />',
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
        '<Select id="loanType" label="Loan type" options={["Home loan", "Car loan"]} value={values.loanType} onChange={(e) => set("loanType", e.target.value)} error={errors.loanType} required />',
    },
    Card: {
      props: { title: "string", subtitle: "string", children: "nodes" },
      example: '<Card title="Personal details" subtitle="Step 1">...</Card>',
    },
    Stepper: {
      props: { steps: "array of step label strings", current: "zero-based index" },
      example: '<Stepper steps={["Personal", "Income", "Loan"]} current={step} />',
    },
  },

  // There is no Textarea or Checkbox component, so these native elements are allowed for those two field types only.
  nativeElements: {
    textarea:
      '<textarea id=".." rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500" />',
    checkbox: '<input type="checkbox" id=".." checked={..} onChange={..} className="mt-1" />',
  },
};

module.exports = { designSystem };