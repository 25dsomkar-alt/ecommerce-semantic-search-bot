interface ScoreBarProps {
  /** Value between 0 and 1. */
  value: number;
  tone?: "indigo" | "slate" | "emerald";
}

const TONE_CLASSES: Record<NonNullable<ScoreBarProps["tone"]>, string> = {
  indigo: "bg-indigo-500",
  slate: "bg-slate-400",
  emerald: "bg-emerald-500",
};

export default function ScoreBar({ value, tone = "indigo" }: ScoreBarProps) {
  const percent = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
      <div className={`h-full rounded-full ${TONE_CLASSES[tone]}`} style={{ width: `${percent}%` }} />
    </div>
  );
}
