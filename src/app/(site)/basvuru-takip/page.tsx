import { TrackForm } from "@/components/forms/track-form";
import { getDictionary } from "@/lib/i18n";

export const instant = false;

export default async function TrackPage() {
  const copy = await getDictionary();
  return (
    <main className="mx-auto max-w-xl px-4 py-14">
      <h1 className="font-serif text-4xl">{copy.track.title}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.track.lead}</p>
      <div className="mt-8">
        <TrackForm copy={copy.track} />
      </div>
    </main>
  );
}
