interface ProgressBarProps {
  value: number; // 0–100
  className?: string;
}

export default function ProgressBar({ value, className = '' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={`w-full h-2 bg-white/10 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-success-green rounded-full"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
