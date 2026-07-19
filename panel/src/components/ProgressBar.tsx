"use client";

export default function ProgressBar({ percentage }: { percentage: number }) {
  let colorClass = "bg-primary";
  if (percentage >= 85) {
    colorClass = "bg-error";
  } else if (percentage >= 60) {
    colorClass = "bg-yellow-400";
  }

  return (
    <div className="w-full bg-surface-variant h-1.5 rounded-full overflow-hidden">
      <div className={`${colorClass} h-full rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
    </div>
  );
}
