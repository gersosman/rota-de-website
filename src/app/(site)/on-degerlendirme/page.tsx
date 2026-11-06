import { AssessmentForm } from "@/components/forms/assessment-form";
import { getDictionary } from "@/lib/i18n";

export const instant = false;

export default async function AssessmentPage() {
  const copy = await getDictionary();
  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[0.8fr_1.2fr]">
      <div>
        <h1 className="font-serif text-4xl">{copy.assessment.title}</h1>
        <p className="mt-4 leading-7 text-muted-foreground">{copy.assessment.lead}</p>
        <p className="mt-6 text-sm leading-6 text-muted-foreground">{copy.disclaimer}</p>
      </div>
      <AssessmentForm
        copy={{
          next: copy.assessment.next,
          back: copy.assessment.back,
          submit: copy.assessment.submit,
          sending: copy.assessment.sending,
          step: copy.assessment.step,
          doneTitle: copy.assessment.doneTitle,
          doneBody: copy.assessment.doneBody,
          duplicate: copy.assessment.duplicate,
          errorInvalid: copy.assessment.errorInvalid,
          errorRate: copy.assessment.errorRate,
          errorOrigin: copy.assessment.errorOrigin,
          errorUnavailable: copy.assessment.errorUnavailable,
          consent: copy.assessment.consent,
          ack: copy.assessment.ack,
          questions: [...copy.assessment.questions],
          options: copy.options,
        }}
      />
    </main>
  );
}
