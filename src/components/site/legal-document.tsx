import { DeletionForm } from "@/components/forms/deletion-form";
import { companyReady, type CompanyProfile } from "@/lib/validation/assessment";

export function LegalDocument({
  title,
  draft,
  company,
  copy,
  showDeletion = false,
}: {
  title: string;
  draft: string;
  company: CompanyProfile;
  showDeletion?: boolean;
  copy: {
    bannerMissing: string;
    bannerFilled: string;
    missing: string;
    fields: Record<keyof CompanyProfile, string>;
    deletionTitle: string;
    deletionBody: string;
    deletionSubmit: string;
    deletionDone: string;
    consent: string;
  };
}) {
  const ready = companyReady(company);
  const rows = Object.keys(copy.fields) as Array<keyof CompanyProfile>;
  return (
    <main className="mx-auto max-w-3xl px-4 py-14">
      <p className="rounded-2xl border border-amber-700/30 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
        {ready ? copy.bannerFilled : copy.bannerMissing}
      </p>
      <h1 className="mt-6 font-serif text-4xl">{title}</h1>
      <p className="mt-4 text-sm leading-7">{draft}</p>
      <dl className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card">
        {rows.map((key) => (
          <div key={key} className="grid gap-1 px-4 py-3 sm:grid-cols-[180px_1fr]">
            <dt className="text-sm text-muted-foreground">{copy.fields[key]}</dt>
            <dd className="text-sm">{company[key] || copy.missing}</dd>
          </div>
        ))}
      </dl>
      {showDeletion ? (
        <DeletionForm
          title={copy.deletionTitle}
          body={copy.deletionBody}
          submit={copy.deletionSubmit}
          done={copy.deletionDone}
          consent={copy.consent}
        />
      ) : null}
    </main>
  );
}
