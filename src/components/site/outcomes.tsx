import { outcomeCounts } from "@/server/operations";

export async function Outcomes({
  title,
  labels,
  hidden,
}: {
  title: string;
  labels: { applications: string; precheck: string; interview: string; contract: string; started: string };
  hidden: string;
}) {
  const counts = await outcomeCounts();
  const rows = [
    ["applications", counts.applications, labels.applications],
    ["precheck", counts.precheck, labels.precheck],
    ["interview", counts.interview, labels.interview],
    ["contract", counts.contract, labels.contract],
    ["started", counts.started, labels.started],
  ] as const;
  const visible = rows.filter((row) => row[1] > 0);
  if (visible.length === 0) {
    return (
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <p className="text-sm leading-6 text-muted-foreground">{hidden}</p>
        </div>
      </section>
    );
  }
  return (
    <section className="border-y border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="font-serif text-2xl">{title}</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {visible.map(([key, value, label]) => (
            <li key={key} className="rounded-2xl border border-border px-4 py-3">
              <p className="font-serif text-3xl">{value}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{label}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
