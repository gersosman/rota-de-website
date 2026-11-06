import { formatMoney } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { publishedServices } from "@/server/knowledge";

export const instant = false;

export default async function ServicesPage() {
  const locale = await getLocale();
  const copy = await getDictionary(locale);
  const services = await publishedServices(locale);
  return (
    <main className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="font-serif text-4xl">{copy.services.title}</h1>
      <p className="mt-4 leading-7 text-muted-foreground">{copy.services.lead}</p>
      <p className="mt-3 text-sm text-muted-foreground">{copy.services.separate}</p>
      {services.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-border p-6 text-sm">{copy.services.empty}</p>
      ) : (
        <ul className="mt-10 space-y-4">
          {services.map((service) => (
            <li key={service.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <h2 className="font-serif text-2xl">{service.name}</h2>
                <p className="text-sm">
                  {service.priceCents === null ? copy.services.priceOnRequest : formatMoney(service.priceCents, service.currency)}
                </p>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{service.description}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
