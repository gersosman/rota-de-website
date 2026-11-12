import { ContactForm } from "@/components/forms/contact-form";
import { TrackAnchor } from "@/components/site/track-anchor";
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
            <TrackAnchor href={bot} event="telegram_click" className="mt-4 inline-flex h-11 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground">
              {copy.contact.botOpen}
            </TrackAnchor>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">{copy.phase3.telegramPending}</p>
          )}
        </div>
      </div>
      <ContactForm
        labels={{
          fullName: copy.options.fullName,
          email: copy.options.emailAddress,
          message: copy.contact.message,
          preference: copy.precheck.channelTitle,
          phone: copy.contact.phone,
          telegram: copy.precheck.telegramUser,
          channelHint: copy.precheck.channelHint,
          channelNeed: copy.precheck.channelNeed,
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
