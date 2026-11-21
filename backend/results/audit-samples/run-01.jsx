export default function Wizard({ initialValues, onSubmit }) {
  const [values, setValues] = useState({ ...initialValues });
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Identity",
      subtitle: "Verify your personal details",
      fields: ["pan", "fullName", "email"],
    },
    {
      title: "Contact",
      subtitle: "How we can reach you",
      fields: ["phone", "dob", "address", "employmentType"],
    },
    {
      title: "Work",
      subtitle: "Your employment information",
      fields: ["employerName", "jobTitle", "yearsEmployed", "monthlyIncome"],
    },
    {
      title: "Finances",
      subtitle: "Income and loan type",
      fields: ["otherIncome", "monthlyExpenses", "existingEmi", "loanType"],
    },
    {
      title: "Loan & agreement",
      subtitle: "Amount, tenure and consent",
      fields: ["loanAmount", "tenure", "purpose", "agree"],
    },
  ];

  const set = (id, value) => {
    setValues((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => ({ ...prev, [id]: "" }));
  };

  const validate = (ids) => {
    const next = {};
    ids.forEach((id) => {
      const val = values[id];
      if (["pan", "fullName", "email", "phone", "dob", "address", "employmentType", "employerName", "jobTitle", "yearsEmployed", "monthlyIncome", "otherIncome", "monthlyExpenses", "existingEmi", "loanType", "loanAmount", "tenure", "purpose", "agree"].includes(id)) {
        const fieldDef = schemaFields[id];
        if (fieldDef.required && (val === undefined || val === "" || (fieldDef.type === "checkbox" && !val))) {
          next[id] = "This field is required";
        }
      }
    });
    if (ids.includes("email") && values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      next.email = "Enter a valid email address";
    }
    if (ids.includes("phone") && values.phone && !/^[6-9]\d{9}$/.test(values.phone)) {
      next.phone = "Enter a 10‑digit mobile number starting with 6‑9";
    }
    if (ids.includes("dob") && values.dob) {
      const age = Math.floor((Date.now() - new Date(values.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) next.dob = "You must be at least 18 years old";
    }
    if (ids.includes("pan") && values.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(values.pan)) {
      next.pan = "PAN must be in format ABCDE1234F";
    }
    if (ids.includes("yearsEmployed") && values.yearsEmployed !== "" && (values.yearsEmployed < 0 || values.yearsEmployed > 50)) {
      next.yearsEmployed = "Enter a value between 0 and 50";
    }
    if (ids.includes("monthlyIncome") && values.monthlyIncome !== "" && values.monthlyIncome < 1) {
      next.monthlyIncome = "Must be at least 1";
    }
    if (ids.includes("otherIncome") && values.otherIncome !== "" && values.otherIncome < 0) {
      next.otherIncome = "Cannot be negative";
    }
    if (ids.includes("monthlyExpenses") && values.monthlyExpenses !== "" && values.monthlyExpenses < 0) {
      next.monthlyExpenses = "Cannot be negative";
    }
    if (ids.includes("existingEmi") && values.existingEmi !== "" && values.existingEmi < 0) {
      next.existingEmi = "Cannot be negative";
    }
    if (ids.includes("loanAmount") && values.loanAmount !== "" && (values.loanAmount < 10000 || values.loanAmount > 10000000)) {
      next.loanAmount = "Amount must be between 10,000 and 10,000,000";
    }
    setErrors((prev) => ({ ...prev, ...next }));
    return Object.keys(next).length === 0;
  };

  const schemaFields = {
    fullName: { required: true },
    email: { required: true },
    pan: { required: true },
    phone: { required: true },
    dob: { required: true },
    address: { required: true },
    employmentType: { required: true },
    employerName: { required: true },
    jobTitle: { required: true },
    yearsEmployed: { required: true, min: 0, max: 50 },
    monthlyIncome: { required: true, min: 1 },
    otherIncome: { required: false, min: 0 },
    monthlyExpenses: { required: true, min: 0 },
    existingEmi: { required: true, min: 0 },
    loanType: { required: true },
    loanAmount: { required: true, min: 10000, max: 10000000 },
    tenure: { required: true },
    purpose: { required: true },
    agree: { required: true, type: "checkbox" },
  };

  const current = steps[step];
  const isLast = step === steps.length - 1;

  const goNext = () => {
    if (!validate(current.fields)) return;
    if (isLast) onSubmit(values);
    else setStep(step + 1);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <Stepper steps={steps.map((s) => s.title)} current={step} />
      <Card title={current.title} subtitle={current.subtitle}>
        <div className="space-y-4">
          {current.fields.includes("pan") && (
            <Input
              id="pan"
              label="PAN number"
              value={values.pan}
              onChange={(e) => set("pan", e.target.value)}
              error={errors.pan}
              hint="Format: ABCDE1234F"
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
          {current.fields.includes("email") && (
            <Input
              id="email"
              label="Email address"
              type="email"
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
              error={errors.email}
              hint="e.g. name@example.com"
              required
            />
          )}
          {current.fields.includes("phone") && (
            <Input
              id="phone"
              label="Mobile number"
              type="tel"
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
              error={errors.phone}
              required
            />
          )}
          {current.fields.includes("dob") && (
            <Input
              id="dob"
              label="Date of birth"
              type="date"
              value={values.dob}
              onChange={(e) => set("dob", e.target.value)}
              error={errors.dob}
              required
            />
          )}
          {current.fields.includes("address") && (
            <textarea
              id="address"
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Residential address"
              value={values.address || ""}
              onChange={(e) => set("address", e.target.value)}
            />
          )}
          {current.fields.includes("employmentType") && (
            <Select
              id="employmentType"
              label="Employment type"
              options={["Salaried", "Self-employed", "Business owner", "Student", "Retired"]}
              value={values.employmentType}
              onChange={(e) => set("employmentType", e.target.value)}
              error={errors.employmentType}
              required
            />
          )}
          {current.fields.includes("employerName") && (
            <Input
              id="employerName"
              label="Employer / business name"
              value={values.employerName}
              onChange={(e) => set("employerName", e.target.value)}
              error={errors.employerName}
              required
            />
          )}
          {current.fields.includes("jobTitle") && (
            <Input
              id="jobTitle"
              label="Job title"
              value={values.jobTitle}
              onChange={(e) => set("jobTitle", e.target.value)}
              error={errors.jobTitle}
              required
            />
          )}
          {current.fields.includes("yearsEmployed") && (
            <Input
              id="yearsEmployed"
              label="Years in current job"
              type="number"
              value={values.yearsEmployed}
              onChange={(e) => set("yearsEmployed", e.target.value)}
              error={errors.yearsEmployed}
              required
            />
          )}
          {current.fields.includes("monthlyIncome") && (
            <Input
              id="monthlyIncome"
              label="Monthly income (₹)"
              type="number"
              value={values.monthlyIncome}
              onChange={(e) => set("monthlyIncome", e.target.value)}
              error={errors.monthlyIncome}
              required
            />
          )}
          {current.fields.includes("otherIncome") && (
            <Input
              id="otherIncome"
              label="Other monthly income (₹)"
              type="number"
              value={values.otherIncome}
              onChange={(e) => set("otherIncome", e.target.value)}
              error={errors.otherIncome}
            />
          )}
          {current.fields.includes("monthlyExpenses") && (
            <Input
              id="monthlyExpenses"
              label="Monthly expenses (₹)"
              type="number"
              value={values.monthlyExpenses}
              onChange={(e) => set("monthlyExpenses", e.target.value)}
              error={errors.monthlyExpenses}
              required
            />
          )}
          {current.fields.includes("existingEmi") && (
            <Input
              id="existingEmi"
              label="Existing EMIs per month (₹)"
              type="number"
              value={values.existingEmi}
              onChange={(e) => set("existingEmi", e.target.value)}
              error={errors.existingEmi}
              required
            />
          )}
          {current.fields.includes("loanType") && (
            <Select
              id="loanType"
              label="Loan type"
              options={["Personal loan", "Home loan", "Car loan", "Education loan", "Business loan"]}
              value={values.loanType}
              onChange={(e) => set("loanType", e.target.value)}
              error={errors.loanType}
              required
            />
          )}
          {current.fields.includes("loanAmount") && (
            <Input
              id="loanAmount
