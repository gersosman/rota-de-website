import { PrecheckWizard } from "@/components/forms/precheck-wizard";
import { getDictionary } from "@/lib/i18n";

export const instant = false;

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value.slice(0, 40) : "";
}

export default async function AssessmentPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await props.searchParams;
  const copy = await getDictionary();
  const text = copy.phase3;
  return (
    <main>
      <PrecheckWizard
        initial={{ ce: one(params.ce), src3: one(params.src3) }}
        copy={{
          ...copy.precheck,
          name: text.journey.name,
          phone: text.journey.phone,
          city: text.journey.city,
          email: text.journey.email,
          note: text.journey.note,
          preference: text.journey.preference,
          channelEmail: text.journey.channelEmail,
          channelPhone: text.journey.channelPhone,
          marketing: text.journey.marketingOpt,
          consent: copy.assessment.consent,
          ack: copy.assessment.ack,
          countryDetail: copy.precheck.countryDetail,
          emailHint: copy.precheck.emailHint,
          emailInvalid: copy.precheck.emailInvalid,
          countries: {
            TR: copy.options.TR,
            DE: copy.options.DE,
            EU_EEA_OTHER: copy.options.EU_EEA_OTHER,
            OTHER: copy.options.OTHER,
          },
          experience: {
            none: text.journey.exNone,
            under_1: text.journey.exUnder,
            y1_3: text.journey.ex13,
            y3_5: text.journey.ex35,
            y5_plus: text.journey.ex5,
          },
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
