import { getDictionary, getLocale } from "@/lib/i18n";
import { activeLegislation } from "@/server/knowledge";

export const instant = false;

export default async function ConditionsPage() {
  const locale = await getLocale();
  const copy = await getDictionary(locale);
  const law = await activeLegislation();
  const summary = law ? (locale === "de" ? law.summary_de : law.summary_tr) : "";
  const abs1Label = law ? (locale === "de" ? law.abs1_label_de : law.abs1_label_tr) : "";
  const abs1 = law ? (locale === "de" ? law.abs1_note_de : law.abs1_note_tr) : "";
  const abs2Label = law ? (locale === "de" ? law.abs2_label_de : law.abs2_label_tr) : "";
  const abs2 = law ? (locale === "de" ? law.abs2_note_de : law.abs2_note_tr) : "";
  return (
    <main className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="font-serif text-4xl">{copy.conditions.title}</h1>
      <p className="mt-4 leading-7 text-muted-foreground">{copy.conditions.lead}</p>
      <section className="mt-10 rounded-2xl border border-amber-700/30 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        <p className="font-medium">{copy.conditions.unverified}</p>
        {law ? <p className="mt-2 text-xs">Sürüm: {String(law.version_label)} · {String(law.review_status)}</p> : null}
      </section>
      {law ? (
        <section className="mt-8 space-y-6">
          <h2 className="font-serif text-2xl">{copy.conditions.lawTitle}</h2>
          <p className="text-sm leading-7">{String(summary)}</p>
          <article>
            <h3 className="font-medium">{String(abs1Label)}</h3>
            <p className="mt-1 text-sm leading-7 text-muted-foreground">{String(abs1)}</p>
          </article>
          <article>
            <h3 className="font-medium">{String(abs2Label)}</h3>
            <p className="mt-1 text-sm leading-7 text-muted-foreground">{String(abs2)}</p>
          </article>
        </section>
      ) : null}
      <section className="mt-10">
        <h2 className="font-serif text-2xl">{copy.conditions.collectedTitle}</h2>
        <p className="mt-2 text-sm leading-7">{copy.conditions.collected}</p>
      </section>
      <section className="mt-8">
        <h2 className="font-serif text-2xl">{copy.conditions.notTitle}</h2>
        <p className="mt-2 text-sm leading-7">{copy.conditions.not}</p>
      </section>
    </main>
  );
}
