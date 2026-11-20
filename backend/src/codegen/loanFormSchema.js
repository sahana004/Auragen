// Plain-JSON description of the loan form (what the LLM sees).
// It mirrors frontend/app/form/formSchema.js.

const loanFormSchema = {
  formId: "loan-application",
  title: "Loan application",
  sections: [
    {
      id: "personal",
      title: "Personal details",
      fields: [
        { id: "fullName", label: "Full name", type: "text", required: true },
        { id: "email", label: "Email address", type: "email", required: true, validation: "valid email format" },
        { id: "phone", label: "Mobile number", type: "tel", required: true, validation: "10 digits starting with 6-9" },
        { id: "dob", label: "Date of birth", type: "date", required: true, validation: "must be at least 18 years old" },
        { id: "pan", label: "PAN number", type: "text", required: true, validation: "format ABCDE1234F (5 capital letters, 4 digits, 1 capital letter)" },
        { id: "address", label: "Residential address", type: "textarea", required: true },
      ],
    },
    {
      id: "employment",
      title: "Employment details",
      fields: [
        { id: "employmentType", label: "Employment type", type: "select", required: true, options: ["Salaried", "Self-employed", "Business owner", "Student", "Retired"] },
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
        { id: "loanType", label: "Loan type", type: "select", required: true, options: ["Personal loan", "Home loan", "Car loan", "Education loan", "Business loan"] },
        { id: "loanAmount", label: "Loan amount (₹)", type: "number", required: true, min: 10000, max: 10000000 },
        { id: "tenure", label: "Tenure", type: "select", required: true, options: ["12 months", "24 months", "36 months", "60 months", "84 months"] },
        { id: "purpose", label: "Purpose of loan", type: "textarea", required: true },
      ],
    },
    {
      id: "declaration",
      title: "Declaration",
      fields: [
        { id: "agree", label: "I confirm the details above are correct and I accept the terms and conditions", type: "checkbox", required: true },
      ],
    },
  ],
};

const allFieldIds = loanFormSchema.sections.flatMap((s) => s.fields.map((f) => f.id));

module.exports = { loanFormSchema, allFieldIds };