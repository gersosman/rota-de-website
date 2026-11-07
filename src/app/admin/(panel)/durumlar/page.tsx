import { trackerCopyAction } from "@/server/actions/tracker";
import { TRACKER_LABEL, TRACKER_STAGES } from "@/lib/domain/tracker";
import { listTrackerCopy } from "@/server/tracker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const instant = false;

export default async function TrackerCopyPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await props.searchParams;
  const notice = typeof params.notice === "string" ? params.notice : "";
  const rows = await listTrackerCopy();
  const byStage = new Map(rows.map((row) => [row.stage, row.body]));
  return (
    <main className="mx-auto max-w-3xl">
      <h1 className="font-serif text-4xl">Adayın gördüğü metinler</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Bu metinler başvuru takip ekranında görünür. İç notlar burada yoktur.</p>
      {notice ? <p className="mt-4 rounded-xl border border-border bg-card px-4 py-3 text-sm">{notice}</p> : null}
      <div className="mt-6 space-y-4">
        {TRACKER_STAGES.map((stage) => (
          <form key={stage} action={trackerCopyAction} className="rounded-2xl border border-border bg-card p-4">
            <h2 className="font-medium">{TRACKER_LABEL[stage]}</h2>
            <input type="hidden" name="stage" value={stage} />
            <Textarea name="body" defaultValue={byStage.get(stage) ?? ""} className="mt-3" required minLength={10} />
            <Button type="submit" variant="outline" className="mt-3 h-10">Kaydet</Button>
          </form>
        ))}
      </div>
    </main>
  );
}
