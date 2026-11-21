export default function Wizard({ initialValues, onSubmit }) {
  const [values, setValues] = useState({ ...initialValues });
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Your basics",
      subtitle: "Help us get to know you",
      fields: ["dob", "fullName", "email", "phone"],
    },
    {
      title: "Address",
      subtitle: "Where we can reach you",
      fields: ["address"],
    },
    {
      title: "Employment",
      subtitle: "Your work details",
      fields: ["employmentType", "employerName", "jobTitle", "yearsEmployed"],
    },
    {
      title: "Income",
      subtitle: "Your financial picture",
      fields: ["monthlyIncome", "otherIncome", "monthlyExpenses", "existingEmi"],
    },
    {
      title: "Loan details",
      subtitle: "What you need",
      fields: ["loanType", "loanAmount", "tenure", "purpose"],
    },
    {
      title: "Declaration",
      subtitle: "Final step",
      fields: ["agree"],
    },
  ];

  const set = (id, val) => {
    setValues((prev) => ({ ...prev, [id]: val }));
    setErrors((prev) => ({ ...prev, [id]: "" }));
  };

  const validate = (ids) => {
    const newErrors = {};
    ids.forEach((id) => {
      const val = values[id];
      if (["fullName", "email", "phone", "dob", "address", "employmentType", "employerName", "jobTitle", "yearsEmployed", "monthlyIncome", "monthlyExpenses", "existingEmi", "loanType", "loanAmount", "tenure", "purpose", "agree"].includes(id)) {
        if (id === "agree") {
          if (!val) newErrors[id] = "You must accept the terms";
        } else if (!val && val !== 0) {
          newErrors[id] = "This field is required";
        }
      }
      if (id === "email" && val) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) newErrors[id] = "Enter a valid email address";
      }
      if (id === "phone" && val) {
        if (!/^[6-9]\d{9}$/.test(val)) newErrors[id] = "Enter a valid 10‑digit mobile number starting with 6‑9";
      }
      if (id === "dob" && val) {
        const today = new Date();
        const birth = new Date(val);
        const age = today.getFullYear() - birth.getFullYear() - (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
        if (age < 18) newErrors[id] = "You must be at least 18 years old";
      }
      if (id === "pan" && val) {
        if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(val)) newErrors[id] = "Enter PAN in format ABCDE1234F";
      }
      if (["yearsEmployed", "monthlyIncome", "otherIncome", "monthlyExpenses", "existingEmi", "loanAmount"].includes(id) && val !== undefined && val !== "") {
        const num = Number(val);
        const constraints = {
          yearsEmployed: { min: 0, max: 50 },
          monthlyIncome: { min: 1 },
          otherIncome: { min: 0 },
          monthlyExpenses: { min: 0 },
          existingEmi: { min: 0 },
          loanAmount: { min: 10000, max: 10000000 },
        };
        const { min, max } = constraints[id];
        if (min !== undefined && num < min) newErrors[id] = `Must be at least ${min}`;
        if (max !== undefined && num > max) newErrors[id] = `Must be at most ${max}`;
      }
    });
    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const isLast = step === steps.length - 1;
  const current = steps[step];

  const goNext = () => {
    if (!validate(current.fields)) return;
    if (isLast) onSubmit(values);
    else setStep(step + 1);
  };

  const goBack = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <Stepper steps={steps.map((s) => s.title)} current={step} />
      <Card title={current.title} subtitle={current.subtitle}>
        <div className="space-y-4">
          {current.fields.includes("dob") && (
            <Input
              id="dob"
              label="Date of birth"
              type="date"
              value={values.dob || ""}
              onChange={(e) => set("dob", e.target.value)}
              error={errors.dob}
              hint="You must be at least 18 years old"
              required
            />
          )}
          {current.fields.includes("fullName") && (
            <Input
              id="fullName"
              label="Full name"
              value={values.fullName || ""}
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
              value={values.email || ""}
              onChange={(e) => set("email", e.target.value)}
              error={errors.email}
              hint="name@example.com"
              required
            />
          )}
          {current.fields.includes("phone") && (
            <Input
              id="phone"
              label="Mobile number"
              type="tel"
              value={values.phone || ""}
              onChange={(e) => set("phone", e.target.value)}
              error={errors.phone}
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
              value={values.employmentType || ""}
              onChange={(e) => set("employmentType", e.target.value)}
              error={errors.employmentType}
              required
            />
          )}
          {current.fields.includes("employerName") && (
            <Input
              id="employerName"
              label="Employer / business name"
              value={values.employerName || ""}
              onChange={(e) => set("employerName", e.target.value)}
              error={errors.employerName}
              required
            />
          )}
          {current.fields.includes("jobTitle") && (
            <Input
              id="jobTitle"
              label="Job title"
              value={values.jobTitle || ""}
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
              value={values.yearsEmployed || ""}
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
              value={values.monthlyIncome || ""}
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
              value={values.otherIncome || ""}
              onChange={(e) => set("otherIncome", e.target.value)}
              error={errors.otherIncome}
            />
          )}
          {current.fields.includes("monthlyExpenses") && (
            <Input
              id="monthlyExpenses"
              label="Monthly expenses (₹)"
              type="number"
              value={values.monthlyExpenses || ""}
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
              value={values.existingEmi || ""}
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
              value={values.loanType || ""}
              onChange={(e) => set("loanType", e.target.value)}
              error={errors.loanType}
              required
            />
          )}
          {current.fields.includes("loanAmount") && (
            <Input
              id="loanAmount"
              label="Loan amount (₹)"
              type="number"
              value={values.loanAmount || ""}
              onChange={(e) => set("loanAmount", e.target.value)}
              error={errors.loanAmount}
              required
            />
          )}
          {current.fields.includes("tenure") && (
            <Select
              id="tenure"
              label="Tenure"
              options={["12 months", "24 months", "36 months", "60 months", "84 months"]}
              value={values.tenure || ""}
              onChange={(e) => set("tenure", e.target.value)}
              error={errors.tenure}
              required
            />
          )}
          {current.fields.includes("purpose") && (
            <textarea
              id="purpose"
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Purpose of loan"
              value={values.purpose || ""}
              onChange={(e) => set("purpose", e.target.value)}
            />
          )}
          {current.fields.includes("agree") && (
            <div className="flex items-start">
              <input
                type="checkbox"
                id="agree"
                checked={!!values.agree}
                onChange={(e) => set("agree", e.target.checked)}
                className="mt-1 mr-2"
              />
              <label htmlFor="agree" className="text-gray-800">
                I confirm the details above are correct and I accept the terms and conditions
              </label>
            </div>
          )}
          {errors.agree && <p className="text-sm text-red-600">{errors.agree}</p>}
        </div>
      </Card>
      <div className="flex justify-between">
        <Button variant="secondary" disabled={step === 0} onClick={goBack}>
          Back
        </Button>
        <Button variant="primary" onClick={goNext}>
          {isLast ? "Submit" : "Next"}
        </Button>
      </div>
    </div>
  );
}
