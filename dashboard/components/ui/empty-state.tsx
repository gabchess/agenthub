export function EmptyState({
  message = "No data available",
  icon,
}: {
  message?: string;
  icon?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-600">
      {icon && <div className="text-3xl mb-3 opacity-40">{icon}</div>}
      <div className="bg-surface border border-border rounded-lg px-6 py-4 text-center max-w-sm">
        <div className="font-mono text-sm mb-1.5">
          <span className="text-gray-500">$</span>{" "}
          <span className="text-gray-400">query</span>{" "}
          <span className="text-accent-cyan">--results</span>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">{message}</p>
      </div>
      <div className="mt-3 text-[10px] text-gray-700 font-mono">
        // waiting for data...
      </div>
    </div>
  );
}
