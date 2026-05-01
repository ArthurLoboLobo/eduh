interface ProgressBarProps {
  value: number; // 0–100
  className?: string;
}

export default function ProgressBar({ value, className = '' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={`w-full h-[6px] bg-[rgba(236,229,214,0.08)] rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-forest-success rounded-full"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
