// Describes every section and field of the demo loan form.
// Later, this schema is also sent to the LLM so it understands the form.

const isAdult = (v) => {
  const dob = new Date(v);
  const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
  return age >= 18 ? "" : "You must be at least 18 years old";
};

export const formSchema = [
  {
    id: "personal",
    title: "Personal details",
    fields: [
      { id: "fullName", label: "Full name", type: "text", required: true },
      {
        id: "email", label: "Email address", type: "email", required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, patternMessage: "Enter a valid email address",
      },
      {
        id: "phone", label: "Mobile number", type: "tel", required: true,
        pattern: /^[6-9]\d{9}$/, patternMessage: "Enter a 10-digit mobile number",
      },
      { id: "dob", label: "Date of birth", type: "date", required: true, validate: isAdult },
      {
        id: "pan", label: "PAN number", type: "text", required: true,
        pattern: /^[A-Z]{5}[0-9]{4}[A-Z]$/, patternMessage: "Format: ABCDE1234F (capital letters)",
      },
      { id: "address", label: "Residential address", type: "textarea", required: true, wide: true },
    ],
  },
  {
    id: "employment",
    title: "Employment details",
    fields: [
      {
        id: "employmentType", label: "Employment type", type: "select", required: true,
        options: ["Salaried", "Self-employed", "Business owner", "Student", "Retired"],
      },
      { id: "employerName", label: "Employer / business name", type: "text", required: true },
      { id: "jobTitle", label: "Job title", type: "text", required: true },
      { id: "yearsEmployed", label: "Years in current job", type: "number", required: true, min: 0, max: 50 },
    ],
  },
  {
    id: "income",
    title: "Income and obligations",
    fields: [
      { id: "monthlyIncome", label: "Monthly income (₹)", type: "number", required: true, min: 1 },
      { id: "otherIncome", label: "Other monthly income (₹)", type: "number", required: false, min: 0 },
      { id: "monthlyExpenses", label: "Monthly expenses (₹)", type: "number", required: true, min: 0 },
      { id: "existingEmi", label: "Existing EMIs per month (₹)", type: "number", required: true, min: 0 },
    ],
  },
  {
    id: "loan",
    title: "Loan details",
    fields: [
      {
        id: "loanType", label: "Loan type", type: "select", required: true,
        options: ["Personal loan", "Home loan", "Car loan", "Education loan", "Business loan"],
      },
      { id: "loanAmount", label: "Loan amount (₹)", type: "number", required: true, min: 10000, max: 10000000 },
      {
        id: "tenure", label: "Tenure", type: "select", required: true,
        options: ["12 months", "24 months", "36 months", "60 months", "84 months"],
      },
      { id: "purpose", label: "Purpose of loan", type: "textarea", required: true, wide: true },
    ],
  },
  {
    id: "declaration",
    title: "Declaration",
    fields: [
      {
        id: "agree", type: "checkbox", required: true, wide: true,
        label: "I confirm the details above are correct and I accept the terms and conditions",
      },
    ],
  },
];

export const allFields = formSchema.flatMap((s) => s.fields);

export function initialValues() {
  const values = {};
  allFields.forEach((f) => (values[f.id] = f.type === "checkbox" ? false : ""));
  return values;
}

// Returns an error message, or "" if the value is valid.
export function validateField(field, value) {
  if (field.type === "checkbox") {
    return field.required && !value ? "You must accept the declaration" : "";
  }
  const text = String(value).trim();
  if (!text) return field.required ? `${field.label} is required` : "";
  if (field.pattern && !field.pattern.test(text)) return field.patternMessage;
  if (field.type === "number") {
    const n = Number(text);
    if (Number.isNaN(n)) return "Enter a valid number";
    if (field.min !== undefined && n < field.min) return `Must be at least ${field.min}`;
    if (field.max !== undefined && n > field.max) return `Must be at most ${field.max}`;
  }
  if (field.validate) return field.validate(text);
  return "";
}