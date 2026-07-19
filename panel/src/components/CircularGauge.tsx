"use client";

export default function CircularGauge({ label, percentage, subText }: { label?: string, percentage: number, subText: string }) {
  // Determine color based on usage
  let colorClass = "text-primary";
  if (percentage >= 85) {
    colorClass = "text-error";
  } else if (percentage >= 60) {
    colorClass = "text-yellow-400";
  }

  // Circle path logic
  const dashArray = 251.2;
  const dashOffset = dashArray - (dashArray * percentage) / 100;

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full h-full py-2">
      {label && <span className="text-xs text-on-surface-variant uppercase tracking-widest self-start mb-2">{label}</span>}
      <div className="relative w-32 h-32 flex-shrink-0">
        <svg className="circular-gauge w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle className="text-surface-variant/30" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeWidth="6"></circle>
          <circle 
            className={colorClass} 
            cx="50" cy="50" 
            fill="transparent" 
            r="40" 
            stroke="currentColor" 
            strokeDasharray={dashArray} 
            strokeDashoffset={dashOffset} 
            strokeLinecap="round" 
            strokeWidth="6"
            style={{ transition: "stroke-dashoffset 0.5s ease-in-out, color 0.5s ease-in-out" }}
          ></circle>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold text-on-surface">{percentage}%</span>
        </div>
      </div>
      <div className="text-xs text-on-surface-variant/80 font-medium w-full text-center mt-3">{subText}</div>
    </div>
  );
}
