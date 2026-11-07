import { ContactForm } from "@/components/forms/contact-form";
import { Button } from "@/components/ui/button";
import { getDictionary } from "@/lib/i18n";
import { publicBotLink } from "@/server/telegram/inbox";

export const instant = false;

export default async function ContactPage() {
  const copy = await getDictionary();
  const bot = await publicBotLink();
  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-2">
      <div>
        <h1 className="font-serif text-4xl">{copy.contact.title}</h1>
        <p className="mt-4 leading-7 text-muted-foreground">{copy.contact.lead}</p>
        <div className="mt-8 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-serif text-2xl">{copy.contact.botTitle}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{bot ? copy.contact.botBody : copy.contact.botMissing}</p>
          {bot ? (
            <Button nativeButton={false} variant="accent" className="mt-4 h-11" render={<a href={bot} target="_blank" rel="noopener noreferrer" />}>
              {copy.contact.botOpen}
            </Button>
          ) : null}
        </div>
      </div>
      <ContactForm
        labels={{
          fullName: copy.options.fullName,
          email: copy.options.emailAddress,
          message: copy.contact.message,
          preference: copy.options.preference,
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
