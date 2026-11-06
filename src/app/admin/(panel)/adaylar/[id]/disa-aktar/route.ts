import { exportLead } from "@/server/leads";
import { requirePanel } from "@/server/auth";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requirePanel();
  const { id } = await context.params;
  const data = await exportLead(admin.profileId, id);
  if (!data) return new Response("Bulunamadı", { status: 404 });
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${data.publicCode}.json"`,
      "cache-control": "private, no-store",
    },
  });
}
