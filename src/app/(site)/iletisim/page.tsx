import { ContactForm } from "@/components/forms/contact-form";
import { getDictionary } from "@/lib/i18n";

export const instant = false;

export default async function ContactPage() {
  const copy = await getDictionary();
  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div>
        <h1 className="font-serif text-4xl">{copy.contact.title}</h1>
        <p className="mt-4 max-w-md leading-7 text-muted-foreground">{copy.contact.lead}</p>
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
