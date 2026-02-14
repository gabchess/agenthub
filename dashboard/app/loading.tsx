export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="relative">
        <div className="w-10 h-10 border-2 border-accent-green/20 rounded-full" />
        <div className="absolute inset-0 w-10 h-10 border-2 border-transparent border-t-accent-green rounded-full animate-spin" />
      </div>
      <div className="text-accent-green font-mono text-sm flex items-center gap-1">
        <span className="animate-pulse-slow">Loading</span>
        <span className="animate-pulse">...</span>
      </div>
    </div>
  );
}
