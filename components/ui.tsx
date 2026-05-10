import { ReactNode } from "react";

export function Card({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function StatCard({
  label,
  value,
  tone = "default"
}: {
  label: string;
  value: string;
  tone?: "default" | "blue" | "green" | "orange" | "red";
}) {
  const toneClass =
    tone === "blue"
      ? "text-app-blue"
      : tone === "green"
        ? "text-app-green"
        : tone === "orange"
          ? "text-app-orange"
          : tone === "red"
            ? "text-app-red"
            : "text-app-primary";
  const statClass =
    tone === "blue"
      ? "stat-card stat-card-blue"
      : tone === "green"
        ? "stat-card stat-card-green"
        : tone === "orange"
          ? "stat-card stat-card-orange"
          : tone === "red"
            ? "stat-card stat-card-red"
            : "stat-card";

  return (
    <Card className={statClass}>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className={`mt-4 text-5xl font-bold tracking-[-0.02em] ${toneClass}`}>
        {value}
      </p>
    </Card>
  );
}

export function Badge({
  children,
  tone = "neutral"
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "orange" | "red" | "blue";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function PageHeader({
  title,
  subtitle,
  action
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="relative mb-12 overflow-hidden rounded-[28px] bg-white/65 p-7 shadow-[0_24px_70px_rgba(50,50,93,0.10)] backdrop-blur-xl sm:p-9">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#80e9ff,#7a73ff,#635bff,#00d4a6,#ffd166)]" />
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
      <div>
        <p className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-[#635bff]">
          Revenue operations
        </p>
        <h1 className="max-w-5xl text-6xl font-bold tracking-[-0.04em] text-[#0a2540] sm:text-7xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-5 max-w-3xl text-xl font-medium leading-8 text-slate-600">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action}
      </div>
    </div>
  );
}
