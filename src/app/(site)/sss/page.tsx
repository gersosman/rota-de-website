import { getDictionary, getLocale } from "@/lib/i18n";
import { listFaqs } from "@/server/knowledge";

export const instant = false;

export default async function FaqPage() {
  const locale = await getLocale();
  const copy = await getDictionary(locale);
  const extra = await listFaqs(locale, true);
  return (
    <main className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="font-serif text-4xl">{copy.faq.title}</h1>
      <p className="mt-4 text-muted-foreground">{copy.faq.lead}</p>
      <div className="mt-8 space-y-8">
        {copy.faq.groups.map((group) => (
          <section key={group.title}>
            <h2 className="font-serif text-2xl">{group.title}</h2>
            <div className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card">
              {group.items.map((item) => (
                <details key={item.q} className="px-5 py-4">
                  <summary className="cursor-pointer font-medium">{item.q}</summary>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
      <h2 className="mt-12 font-serif text-2xl">{copy.faq.extra}</h2>
      {extra.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{copy.faq.none}</p>
      ) : (
        <div className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
          {extra.map((item) => (
            <details key={String(item.id)} className="px-5 py-4">
              <summary className="cursor-pointer font-medium">{String(item.question)}</summary>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{String(item.answer)}</p>
            </details>
          ))}
        </div>
      )}
    </main>
  );
}
