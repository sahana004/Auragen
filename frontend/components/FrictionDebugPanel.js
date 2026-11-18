export default function FrictionDebugPanel({ metrics, fieldStats, connection }) {
  const fields = Object.entries(fieldStats)
    .sort((a, b) => b[1].dwellMs - a[1].dwellMs)
    .slice(0, 4);

  const serverColor =
    connection === "connected"
      ? "#4ade80" // green
      : connection === "connecting"
      ? "#fde047" // yellow
      : "#f87171"; // red

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 w-72 rounded-lg bg-gray-900 p-3 text-xs text-white shadow-lg">
      <p className="mb-2 font-semibold text-blue-300">Friction tracker (debug)</p>
      <ul className="space-y-1">
        <li>Avg speed: {metrics.avgVelocity} px/s</li>
        <li>Peak speed: {metrics.peakVelocity} px/s</li>
        <li>Direction changes (3s): {metrics.directionChanges}</li>
        <li>Active field: {metrics.activeFieldId || "none"}</li>
        <li>Hesitating: {(metrics.currentHesitationMs / 1000).toFixed(1)} s</li>
        <li>Total hesitations: {metrics.totalHesitations}</li>
        <li>
          Rage clicks: {metrics.rageClicksRecent} (10s) / {metrics.rageClicksTotal} total
        </li>
        <li>
          Click errors: {metrics.clickErrorsRecent} (10s) / {metrics.clickErrorsTotal} total
        </li>
        <li>
          Server:{" "}
          <span style={{ fontWeight: 700, color: serverColor }}>
            {connection || "off"}
          </span>
        </li>
      </ul>

      {fields.length > 0 && (
        <>
          <p className="mb-1 mt-3 font-semibold text-blue-300">Time per field</p>
          <ul className="space-y-1">
            {fields.map(([id, s]) => (
              <li key={id}>
                {id}: {(s.dwellMs / 1000).toFixed(1)} s{s.errors ? ` · ${s.errors} err` : ""}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}