export function EmptyState({ message = "No data available" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-600">
      <div className="font-mono text-sm mb-2">
        <span className="text-gray-500">$</span> query --results
      </div>
      <p className="text-xs">{message}</p>
      <div className="mt-4 text-[10px] text-gray-700 font-mono">
        // {message.toLowerCase()}
      </div>
    </div>
  );
}
