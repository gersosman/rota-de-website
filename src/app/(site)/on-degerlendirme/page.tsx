import { JourneyForm } from "@/components/forms/journey-form";
import { getDictionary } from "@/lib/i18n";
import { publicBotLink } from "@/server/telegram/inbox";

export const instant = false;

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value.slice(0, 80) : "";
}

export default async function AssessmentPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await props.searchParams;
  const copy = await getDictionary();
  const text = copy.phase3;
  const telegram = await publicBotLink();
  return (
    <main>
      <JourneyForm
        telegramHref={telegram}
        initial={{
          ce: one(params.ce),
          src3: one(params.src3),
          german: one(params.german),
          family: one(params.family),
          spouseGerman: one(params.spouseGerman),
          childrenAges: one(params.childrenAges),
        }}
        copy={{
          ...text.journey,
          ceHave: text.ceHave,
          cePlan: text.cePlan,
          srcHave: text.srcHave,
          srcPlan: text.srcPlan,
          srcInfo: text.srcInfo,
          deNone: text.deNone,
          deStart: text.deStart,
          deMid: text.deMid,
          deGood: text.deGood,
          familyAlone: text.familyAlone,
          familySpouse: text.familySpouse,
          familyKids: text.familyKids,
          spouseQ: text.spouseQ,
          childrenQ: text.childrenQ,
          spouseYes: text.spouseYes,
          spouseNo: text.spouseNo,
          spouseLater: text.spouseLater,
          childrenHint: text.childrenHint,
          papers: text.papers,
          telegramPending: text.telegramPending,
          consent: copy.assessment.consent,
          ack: copy.assessment.ack,
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
