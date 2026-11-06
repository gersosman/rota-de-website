import { LegalDocument } from "@/components/site/legal-document";
import { getDictionary } from "@/lib/i18n";
import { getCompany } from "@/server/knowledge";

export const instant = false;

export default async function PrivacyPage() {
  const copy = await getDictionary();
  const company = await getCompany();
  return (
    <LegalDocument
      title={copy.legal.datenschutz}
      draft={copy.legal.draftPrivacy}
      company={company}
      showDeletion
      copy={{ ...copy.legal, consent: copy.assessment.consent }}
    />
  );
}
