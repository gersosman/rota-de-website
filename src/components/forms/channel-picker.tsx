"use client";

const ORDER = ["phone", "email", "telegram"] as const;
export type ContactChannel = (typeof ORDER)[number];

export function ChannelPicker({
  value,
  onChange,
  title,
  hint,
  required,
  labels,
}: {
  value: ContactChannel[];
  onChange: (value: ContactChannel[]) => void;
  title: string;
  hint: string;
  required: string;
  labels: Record<ContactChannel, string>;
}) {
  function toggle(channel: ContactChannel) {
    const next = value.includes(channel) ? value.filter((item) => item !== channel) : [...value, channel];
    onChange(ORDER.filter((item) => next.includes(item)));
  }

  return (
    <fieldset>
      <legend className="text-sm font-medium">{title}</legend>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {ORDER.map((channel) => {
          const selected = value.includes(channel);
          return (
            <button
              key={channel}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(channel)}
              className={`min-h-14 rounded-2xl border px-3 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 ${selected ? "border-accent bg-accent/10 text-foreground" : "border-border bg-card text-foreground hover:border-accent/50"}`}
            >
              {labels[channel]}
            </button>
          );
        })}
      </div>
      {value.length === 0 ? <p className="mt-2 text-xs text-destructive">{required}</p> : null}
    </fieldset>
  );
}
