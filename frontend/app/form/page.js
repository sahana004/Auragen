"use client";
import { useState } from "react";
import { formSchema, allFields, initialValues, validateField } from "./formSchema";
import useFrictionTracker from "../../hooks/useFrictionTracker";
import FrictionDebugPanel from "../../components/FrictionDebugPanel";

const inputClass = (hasError) =>
  `w-full rounded-lg border px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 ${
    hasError ? "border-red-500" : "border-gray-300"
  }`;

export default function LoanFormPage() {
  const { metrics, fieldStats } = useFrictionTracker();
  const [values, setValues] = useState(initialValues());
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field, value) => {
    setValues((prev) => ({ ...prev, [field.id]: value }));
    if (touched[field.id]) {
      setErrors((prev) => ({ ...prev, [field.id]: validateField(field, value) }));
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field.id]: true }));
    setErrors((prev) => ({ ...prev, [field.id]: validateField(field, values[field.id]) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    const newTouched = {};
    allFields.forEach((f) => {
      newTouched[f.id] = true;
      newErrors[f.id] = validateField(f, values[f.id]);
    });
    setTouched(newTouched);
    setErrors(newErrors);

    const firstBad = allFields.find((f) => newErrors[f.id]);
    if (firstBad) {
      document.getElementById(firstBad.id)?.focus();
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <div className="rounded-xl border border-green-300 bg-green-50 p-6">
          <h1 className="text-xl font-bold text-green-800">Application submitted</h1>
          <p className="mt-2 text-sm text-green-700">
            Thank you, {values.fullName}. Your {values.loanType.toLowerCase()} request for ₹
            {Number(values.loanAmount).toLocaleString("en-IN")} is under review.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <FrictionDebugPanel metrics={metrics} fieldStats={fieldStats} />
      <h1 className="text-2xl font-bold">Loan application</h1>
      <p className="mb-6 text-sm text-gray-600">Infotact portal: please complete all sections.</p>

      <form onSubmit={handleSubmit} noValidate className="space-y-6" data-form="loan-application">
        {formSchema.map((section) => (
          <section key={section.id} data-section={section.id} className="rounded-xl border border-gray-200 p-5">
            <h2 className="mb-4 text-lg font-semibold">{section.title}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {section.fields.map((field) => {
                const error = touched[field.id] ? errors[field.id] : "";
                const common = {
                  id: field.id,
                  name: field.id,
                  "aria-invalid": !!error,
                  onBlur: () => handleBlur(field),
                };

                return (
                  <div key={field.id} data-field-id={field.id} className={field.wide ? "sm:col-span-2" : ""}>
                    {field.type === "checkbox" ? (
                      <label className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          {...common}
                          checked={values[field.id]}
                          onChange={(e) => handleChange(field, e.target.checked)}
                          className="mt-1"
                        />
                        <span>{field.label}</span>
                      </label>
                    ) : (
                      <>
                        <label htmlFor={field.id} className="mb-1 block text-sm font-medium">
                          {field.label}
                          {field.required && <span className="text-red-500"> *</span>}
                        </label>

                        {field.type === "select" ? (
                          <select
                            {...common}
                            value={values[field.id]}
                            onChange={(e) => handleChange(field, e.target.value)}
                            className={inputClass(error)}
                          >
                            <option value="">Select...</option>
                            {field.options.map((o) => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                        ) : field.type === "textarea" ? (
                          <textarea
                            {...common}
                            rows={3}
                            value={values[field.id]}
                            onChange={(e) => handleChange(field, e.target.value)}
                            className={inputClass(error)}
                          />
                        ) : (
                          <input
                            {...common}
                            type={field.type}
                            value={values[field.id]}
                            onChange={(e) =>
                              handleChange(
                                field,
                                field.id === "pan" ? e.target.value.toUpperCase() : e.target.value
                              )
                            }
                            className={inputClass(error)}
                          />
                        )}
                      </>
                    )}
                    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Submit application
        </button>
      </form>
    </main>
  );
}