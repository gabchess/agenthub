export default function Loading() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-accent-green font-mono text-sm">
        <span className="animate-pulse-slow">Loading</span>
        <span className="animate-pulse">...</span>
      </div>
    </div>
  );
}
