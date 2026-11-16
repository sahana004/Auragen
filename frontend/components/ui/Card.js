export default function Card({ title, subtitle, children, className = "" }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}>
      {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      <div className={title || subtitle ? "mt-4" : ""}>{children}</div>
    </div>
  );
}