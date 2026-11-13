import Link from "next/link";
import { ContactForm } from "@/components/forms/contact-form";
import { getDictionary } from "@/lib/i18n";

export const instant = false;

export default async function ContactPage() {
  const copy = await getDictionary();
  return (
    <main className="mx-auto grid max-w-6xl gap-12 px-4 py-16 md:py-20 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <div>
        <h1 className="font-serif text-5xl">{copy.contact.title}</h1>
        <p className="mt-5 max-w-md text-lg leading-8 text-muted-foreground">{copy.contact.lead}</p>
        <Link href="/on-degerlendirme" className="mt-8 inline-flex h-14 w-full items-center justify-center rounded-full border border-border px-8 text-base font-medium sm:w-auto">
          {copy.nav.assessment}
        </Link>
      </div>
      <ContactForm
        labels={{
          fullName: copy.options.fullName,
          email: copy.options.emailAddress,
          subject: copy.contact.subject,
          message: copy.contact.message,
          privacy: copy.contact.privacy,
          privacyLink: copy.legal.datenschutz,
          submit: copy.contact.submit,
          done: copy.contact.done,
          sent: copy.contact.sent,
          savedUnsent: copy.contact.savedUnsent,
          savedPending: copy.contact.savedPending,
          duplicate: copy.contact.duplicate,
          errors: {
            invalid: copy.assessment.errorInvalid,
            rate: copy.assessment.errorRate,
            origin: copy.assessment.errorOrigin,
            unavailable: copy.assessment.errorUnavailable,
          },
        }}
      />
    </main>
  );
}
