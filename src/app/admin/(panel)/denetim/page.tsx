import { LEGAL_REVIEW } from "@/lib/content/germany";
import { formatDateTime } from "@/lib/format";
import { sql } from "@/server/db";

export const instant = false;

export default async function AuditPage() {
  const rows = await sql<{ id: string; action: string; entity_type: string | null; entity_id: string | null; created_at: string }>(
    `select id, action, entity_type, entity_id, created_at
     from audit_logs order by created_at desc limit 100`,
  );
  return (
    <main className="mx-auto max-w-4xl">
      <h1 className="font-serif text-4xl">Denetim</h1>
      <section className="mt-6 rounded-2xl border border-amber-700/30 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        <h2 className="font-medium">Hukuki inceleme listesi</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          {LEGAL_REVIEW.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
      <p className="mt-2 text-sm text-muted-foreground">Kişisel veri içeriği bu listede tutulmaz. Son 100 işlem.</p>
      {rows.length === 0 ? <p className="mt-8 text-sm">Kayıt yok.</p> : (
        <table className="mt-6 w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr><th className="py-2">İşlem</th><th>Varlık</th><th>Zaman</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="py-2">{row.action}</td>
                <td>{row.entity_type || "—"}</td>
                <td>{formatDateTime(row.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
