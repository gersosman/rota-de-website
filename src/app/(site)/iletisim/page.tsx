import { ContactForm } from "@/components/forms/contact-form";
import { getDictionary } from "@/lib/i18n";

export const instant = false;

export default async function ContactPage() {
  const copy = await getDictionary();
  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-2">
      <div>
        <h1 className="font-serif text-4xl">{copy.contact.title}</h1>
        <p className="mt-4 leading-7 text-muted-foreground">{copy.contact.lead}</p>
      </div>
      <ContactForm
        labels={{
          fullName: copy.options.fullName,
          email: copy.options.emailAddress,
          message: copy.contact.message,
          preference: copy.options.preference,
          phone: copy.options.phoneOptional,
          consent: copy.assessment.consent,
          submit: copy.contact.submit,
          done: copy.contact.done,
          code: "",
          options: copy.options,
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
