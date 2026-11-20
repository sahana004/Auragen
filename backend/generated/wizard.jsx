export default function Wizard({ initialValues, onSubmit }) {
  const [values, setValues] = useState({ ...initialValues });
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Identity",
      subtitle: "Enter your PAN and name",
      fields: ["pan", "fullName", "email", "phone"],
    },
    {
      title: "Personal details",
      subtitle: "Additional personal info",
      fields: ["dob", "address", "employmentType", "employerName"],
    },
    {
      title: "Job info",
      subtitle: "Your role and tenure",
      fields: ["jobTitle", "yearsEmployed", "monthlyIncome", "otherIncome"],
    },
    {
      title: "Finances",
      subtitle: "Expenses and existing loans",
      fields: ["monthlyExpenses", "existingEmi", "loanType", "loanAmount"],
    },
    {
      title: "Loan & agreement",
      subtitle: "Finalize your request",
      fields: ["tenure", "purpose", "agree"],
    },
  ];

  const set = (id, value) => {
    setValues((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => ({ ...prev, [id]: "" }));
  };

  const validate = (ids) => {
    const newErrors = {};

    ids.forEach((id) => {
      const val = values[id];
      const fieldDef = fieldMap[id];
      if (fieldDef.required) {
        if (fieldDef.type === "checkbox") {
          if (!val) newErrors[id] = "This field is required";
        } else if (!String(val || "").trim()) {
          newErrors[id] = "This field is required";
        }
      }
      if (val) {
        if (id === "email") {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
            newErrors[id] = "Enter a valid email address, e.g., name@example.com";
          }
        }
        if (id === "phone") {
          if (!/^[6-9]\d{9}$/.test(val)) {
            newErrors[id] = "Enter a valid 10‑digit mobile number starting with 6‑9";
          }
        }
        if (id === "dob") {
          const today = new Date();
          const birth = new Date(val);
          const age = today.getFullYear() - birth.getFullYear();
          const m = today.getMonth() - birth.getMonth();
          const dayDiff = today.getDate() - birth.getDate();
          const actualAge = m < 0 || (m === 0 && dayDiff < 0) ? age - 1 : age;
          if (actualAge < 18) newErrors[id] = "You must be at least 18 years old";
        }
        if (id === "pan") {
          if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(val)) {
            newErrors[id] = "PAN must be in format ABCDE1234F";
          }
        }
        if (id === "yearsEmployed") {
          const num = Number(val);
          if (num < 0 || num > 50) newErrors[id] = "Enter a value between 0 and 50";
        }
        if (id === "monthlyIncome") {
          const num = Number(val);
          if (num < 1) newErrors[id] = "Must be at least 1";
        }
        if (id === "otherIncome") {
          const num = Number(val);
          if (num < 0) newErrors[id] = "Cannot be negative";
        }
        if (id === "monthlyExpenses") {
          const num = Number(val);
          if (num < 0) newErrors[id] = "Cannot be negative";
        }
        if (id === "existingEmi") {
          const num = Number(val);
          if (num < 0) newErrors[id] = "Cannot be negative";
        }
        if (id === "loanAmount") {
          const num = Number(val);
          if (num < 10000 || num > 10000000) newErrors[id] = "Enter between 10,000 and 10,000,000";
        }
      }
    });

    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const fieldMap = {
    fullName: { required: true, type: "text" },
    email: { required: true, type: "email" },
    phone: { required: true, type: "tel" },
    dob: { required: true, type: "date" },
    pan: { required: true, type: "text" },
    address: { required: true, type: "textarea" },
    employmentType: { required: true, type: "select" },
    employerName: { required: true, type: "text" },
    jobTitle: { required: true, type: "text" },
    yearsEmployed: { required: true, type: "number", min: 0, max: 50 },
    monthlyIncome: { required: true, type: "number", min: 1 },
    otherIncome: { required: false, type: "number", min: 0 },
    monthlyExpenses: { required: true, type: "number", min: 0 },
    existingEmi: { required: true, type: "number", min: 0 },
    loanType: { required: true, type: "select" },
    loanAmount: { required: true, type: "number", min: 10000, max: 10000000 },
    tenure: { required: true, type: "select" },
    purpose: { required: true, type: "textarea" },
    agree: { required: true, type: "checkbox" },
  };

  const isLast = step === steps.length - 1;
  const current = steps[step];

  const goNext = () => {
    if (!validate(current.fields)) return;
    if (isLast) {
      onSubmit(values);
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <Stepper steps={steps.map((s) => s.title)} current
