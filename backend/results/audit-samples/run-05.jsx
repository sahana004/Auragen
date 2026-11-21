export default function Wizard({ initialValues, onSubmit }) {
  const [values, setValues] = useState({ ...initialValues });
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Loan amount",
      subtitle: "Enter the amount you need",
      fields: ["loanAmount", "loanType"],
    },
    {
      title: "Your details",
      subtitle: "Personal information",
      fields: ["fullName", "email", "phone", "dob"],
    },
    {
      title: "Address & PAN",
      subtitle: "Where you live and tax ID",
      fields: ["address", "pan"],
    },
    {
      title: "Employment",
      subtitle: "Your work situation",
      fields: ["employmentType", "employerName", "jobTitle", "yearsEmployed"],
    },
    {
      title: "Finances",
      subtitle: "Income and obligations",
      fields: [
        "monthlyIncome",
        "otherIncome",
        "monthlyExpenses",
        "existingEmi",
      ],
    },
    {
      title: "Loan purpose",
      subtitle: "Details of the loan",
      fields: ["purpose", "tenure", "agree"],
    },
  ];

  const set = (id, val) => {
    setValues((prev) => ({ ...prev, [id]: val }));
    setErrors((prev) => ({ ...prev, [id]: "" }));
  };

  const validate = (ids) => {
    const newErr = {};
    ids.forEach((id) => {
      const val = values[id];
      if (["fullName", "email", "phone", "dob", "pan", "address", "employmentType", "employerName", "jobTitle", "yearsEmployed", "monthlyIncome", "monthlyExpenses", "existingEmi", "loanAmount", "loanType", "tenure", "purpose", "agree"].includes(id)) {
        if (["agree"].includes(id)) {
          if (!val) newErr[id] = "You must accept the terms";
        } else if (val === undefined || val === "" || val === null) {
          newErr[id] = "This field is required";
        }
      }
      if (id === "email" && val) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) newErr[id] = "Enter a valid email address";
      }
      if (id === "phone" && val) {
        if (!/^[6-9]\d{9}$/.test(val)) newErr[id] = "Enter a valid 10‑digit mobile number starting with 6‑9";
      }
      if (id === "dob" && val) {
        const today = new Date();
        const birth = new Date(val);
        const age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (age < 18 || (age === 18 && m < 0)) newErr[id] = "You must be at least 18 years old";
      }
      if (id === "pan" && val) {
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(val)) newErr[id] = "PAN must be in format ABCDE1234F";
      }
      if (id === "loanAmount" && val) {
        const num = Number(val);
        if (isNaN(num) || num < 10000 || num > 10000000) newErr[id] = "Loan amount must be between 10,000 and 10,000,000";
      }
      if (id === "yearsEmployed" && val) {
        const num = Number(val);
        if (isNaN(num) || num < 0 || num > 50) newErr[id] = "Enter a value between 0 and 50";
      }
      if (["monthlyIncome", "otherIncome", "monthlyExpenses", "existingEmi"].includes(id) && val) {
        const num = Number(val);
        if (isNaN(num) || num < 0) newErr[id] = "Enter a non‑negative number";
      }
    });
    setErrors((prev) => ({ ...prev, ...newErr }));
    return Object.keys(newErr).length === 0;
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
          {current.fields.includes("loanAmount") && (
            <Input
              id="loanAmount"
              label="Loan amount (₹)"
              type="number"
              value={values.loanAmount}
              onChange={(e) => set("loanAmount", e.target.value)}
              error={errors.loanAmount}
              hint="Between 10,000 and 10,000,000"
              required
            />
          )}
          {current.fields.includes("loanType") && (
            <Select
              id="loanType"
              label="Loan type"
              options={[
                "Personal loan",
                "Home loan",
                "Car loan",
                "Education loan",
                "Business loan",
              ]}
              value={values.loanType}
              onChange={(e) => set("loanType", e.target.value)}
              error={errors.loanType}
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
              hint="name@example.com"
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
              hint="10 digits, starts with 6‑9"
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
          {current.fields.includes("employmentType") && (
            <Select
              id="employmentType"
              label="Employment type"
              options={[
                "Salaried",
                "Self-employed",
                "Business owner",
                "Student",
                "Retired",
              ]}
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
              hint="0‑50"
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
          {current.fields.includes("tenure") && (
            <Select
              id="tenure"
              label="Tenure"
              options={["12 months", "24 months", "36 months", "60 months", "84 months"]}
              value={values.tenure}
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
                I confirm the details above are correct and I accept the terms and
                conditions
              </label>
            </div>
          )}
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
