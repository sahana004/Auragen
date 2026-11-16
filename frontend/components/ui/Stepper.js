export default function Stepper({ steps = [], current = 0 }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                done
                  ? "bg-green-600 text-white"
                  : active
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className={`text-sm ${active ? "font-semibold text-gray-900" : "text-gray-500"}`}>
              {label}
            </span>
            {i < steps.length - 1 && <span className="h-px w-6 bg-gray-300" />}
          </li>
        );
      })}
    </ol>
  );
}