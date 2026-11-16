export default function Input({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder = "",
  error = "",
  required = false,
  hint = "",
}) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-800">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-invalid={!!error}
        className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? "border-red-500" : "border-gray-300"
        }`}
      />
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}