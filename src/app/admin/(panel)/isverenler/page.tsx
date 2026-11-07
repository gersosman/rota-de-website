import { employerAction, jobAction, matchAction } from "@/server/actions/operations";
import { listEmployers, listJobs, listMatches } from "@/server/operations";
import { sql } from "@/server/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const instant = false;

export default async function EmployersPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await props.searchParams;
  const notice = typeof params.notice === "string" ? params.notice : "";
  const [employers, jobs, matches, leads] = await Promise.all([
    listEmployers(),
    listJobs(),
    listMatches(),
    sql<{ id: string; public_code: string; full_name: string }>(
      "select id, public_code, full_name from leads where deleted_at is null and merged_into is null order by created_at desc limit 40",
    ),
  ]);
  return (
    <main className="mx-auto max-w-4xl">
      <h1 className="font-serif text-4xl">İşverenler ve fırsatlar</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Buraya yalnız gerçek işveren ve gerçek iş yazılır. Örnek şirket eklenmez. Sözleşme imzalanmadan adayın iş garantisi yoktur. Maaş brüt veya net olarak ayrılır ve sitede ilan edilmez.</p>
      {notice ? <p className="mt-4 rounded-xl bg-muted px-3 py-2 text-sm">{notice}</p> : null}
      <section className="mt-8 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-medium">İşveren</h2>
        {employers.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Kayıtlı işveren yok.</p> : (
          <ul className="mt-3 space-y-1 text-sm">{employers.map((item) => <li key={item.id}>{item.company_name} · {item.city || "şehir yok"} · {item.company_status}</li>)}</ul>
        )}
        <form action={employerAction} className="mt-4 grid gap-2 md:grid-cols-2">
          <Input name="companyName" required placeholder="Şirket adı" className="h-10" />
          <Input name="city" placeholder="Şehir" className="h-10" />
          <Input name="contactPerson" placeholder="İlgili kişi" className="h-10" />
          <Input name="email" type="email" placeholder="E-posta" className="h-10" />
          <Input name="phone" placeholder="İş telefonu" className="h-10" />
          <Input name="industry" placeholder="Faaliyet" className="h-10" />
          <Button type="submit" className="h-10 md:col-span-2">İşvereni kaydet</Button>
        </form>
      </section>
      <section className="mt-6 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-medium">İş fırsatı</h2>
        {jobs.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Fırsat yok.</p> : (
          <ul className="mt-3 space-y-1 text-sm">{jobs.map((item) => <li key={item.id}>{item.company_name} · {item.job_title} · {item.status}{item.salary_amount ? ` · ${item.salary_amount} ${item.salary_basis === "net" ? "net" : "brüt"}` : ""}</li>)}</ul>
        )}
        <form action={jobAction} className="mt-4 grid gap-2 md:grid-cols-2">
          <select name="employerId" required className="h-10 rounded-lg border border-input bg-card px-2 text-sm">
            <option value="">İşveren</option>
            {employers.map((item) => <option key={item.id} value={item.id}>{item.company_name}</option>)}
          </select>
          <Input name="title" required placeholder="Pozisyon" className="h-10" />
          <Input name="location" placeholder="Yer" className="h-10" />
          <Input name="amount" placeholder="Ücret tutarı" className="h-10" />
          <select name="basis" className="h-10 rounded-lg border border-input bg-card px-2 text-sm">
            <option value="">Ücret yok</option>
            <option value="gross">Brüt</option>
            <option value="net">Net</option>
          </select>
          <Input name="hours" placeholder="Çalışma süresi" className="h-10" />
          <Input name="period" placeholder="Dönem, örneğin 2026" className="h-10 md:col-span-2" />
          <Button type="submit" className="h-10">Taslak fırsat</Button>
        </form>
      </section>
      <section className="mt-6 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-medium">Eşleştirme</h2>
        {matches.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Eşleşme yok.</p> : (
          <ul className="mt-3 space-y-1 text-sm">{matches.map((item) => <li key={item.id}>{item.public_code} · {item.job_title} · {item.match_status}{item.interview_date ? ` · ${item.interview_date}` : ""}</li>)}</ul>
        )}
        <form action={matchAction} className="mt-4 grid gap-2 md:grid-cols-2">
          <select name="candidateId" required className="h-10 rounded-lg border border-input bg-card px-2 text-sm">
            <option value="">Aday</option>
            {leads.map((item) => <option key={item.id} value={item.id}>{item.public_code} · {item.full_name}</option>)}
          </select>
          <select name="jobId" required className="h-10 rounded-lg border border-input bg-card px-2 text-sm">
            <option value="">Fırsat</option>
            {jobs.map((item) => <option key={item.id} value={item.id}>{item.job_title}</option>)}
          </select>
          <select name="status" className="h-10 rounded-lg border border-input bg-card px-2 text-sm">
            <option value="proposed">Önerildi</option>
            <option value="interview">Görüşme</option>
            <option value="offer">Teklif</option>
            <option value="contract">Sözleşme</option>
            <option value="declined">Olumsuz</option>
            <option value="closed">Kapandı</option>
          </select>
          <Input name="interviewDate" type="date" className="h-10" />
          <Input name="feedback" placeholder="İşveren notu" className="h-10 md:col-span-2" />
          <Button type="submit" className="h-10">Eşleştir</Button>
        </form>
      </section>
    </main>
  );
}
