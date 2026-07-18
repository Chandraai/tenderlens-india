import { cn } from "@/lib/utils";

export function SectionHeader({
  title,
  kicker,
  action
}: {
  title: string;
  kicker?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {kicker ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-50">{kicker}</p> : null}
        <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">{title}</h1>
      </div>
      {action}
    </div>
  );
}

export function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "green" | "amber" | "red" | "blue" | "slate" }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
    amber: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
    red: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20",
    blue: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20",
    slate: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
  };

  return <span className={cn("inline-flex items-center rounded px-2 py-1 text-xs font-medium ring-1", tones[tone])}>{children}</span>;
}

export function ScoreRing({ score }: { score: number }) {
  const tone = score >= 80 ? "text-emerald-500" : score >= 60 ? "text-amber-500" : "text-rose-500";
  return (
    <div className="grid h-14 w-14 place-items-center rounded-full bg-slate-100 dark:bg-slate-800">
      <span className={cn("text-lg font-bold", tone)}>{score}</span>
    </div>
  );
}

export function Progress({ value, tone = "blue" }: { value: number; tone?: "blue" | "green" | "amber" | "red" }) {
  const colors = {
    blue: "bg-brand-500",
    green: "bg-mint",
    amber: "bg-amber",
    red: "bg-rose"
  };
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
      <div className={cn("h-full rounded-full", colors[tone])} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
