"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePanel } from "@/server/auth";
import { publicGate } from "@/server/actions/guards";
import {
  approveTestimonial,
  createEmployer,
  createJob,
  createMatch,
  createSupportRequest,
  createTestimonial,
  publishArticle,
  saveArticle,
  setPipelineStage,
  updateContactMessage,
} from "@/server/operations";
import { contactInbox } from "@/server/mail";
import { enqueueOutbound, settleOutbound } from "@/server/outbound";

function back(path: string, notice: string): never {
  redirect(`${path}?notice=${encodeURIComponent(notice.slice(0, 180))}`);
}

export async function pipelineAction(formData: FormData) {
  const admin = await requirePanel();
  const leadId = String(formData.get("leadId") ?? "");
  const stage = String(formData.get("stage") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  const ok = await setPipelineStage(admin.profileId, leadId, stage, note);
  revalidatePath(`/admin/adaylar/${leadId}`);
  revalidatePath("/");
  redirect(`/admin/adaylar/${leadId}?notice=${encodeURIComponent(ok ? "Aşama kaydedildi." : "Aşama kaydedilemedi.")}`);
}

export async function contactUpdateAction(formData: FormData) {
  const admin = await requirePanel();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const notes = String(formData.get("notes") ?? "");
  const ok = await updateContactMessage(admin.profileId, id, status, notes);
  revalidatePath("/admin/iletisim");
  back("/admin/iletisim", ok ? "Kayıt güncellendi. E-posta gönderilmedi." : "Kayıt güncellenemedi.");
}

export async function employerAction(formData: FormData) {
  const admin = await requirePanel();
  const ok = await createEmployer(admin.profileId, {
    companyName: String(formData.get("companyName") ?? ""),
    city: String(formData.get("city") ?? ""),
    contactPerson: String(formData.get("contactPerson") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    industry: String(formData.get("industry") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  revalidatePath("/admin/isverenler");
  back("/admin/isverenler", ok ? "İşveren kaydedildi." : "İşveren kaydedilemedi.");
}

export async function jobAction(formData: FormData) {
  const admin = await requirePanel();
  const ok = await createJob(admin.profileId, {
    employerId: String(formData.get("employerId") ?? ""),
    title: String(formData.get("title") ?? ""),
    location: String(formData.get("location") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    basis: String(formData.get("basis") ?? ""),
    hours: String(formData.get("hours") ?? ""),
    period: String(formData.get("period") ?? ""),
  });
  revalidatePath("/admin/isverenler");
  back("/admin/isverenler", ok ? "İş fırsatı taslak olarak kaydedildi. Sitede ilan açılmaz." : "İş fırsatı kaydedilemedi. Ücret varsa brüt veya net seçin.");
}

export async function matchAction(formData: FormData) {
  const admin = await requirePanel();
  const ok = await createMatch(admin.profileId, {
    candidateId: String(formData.get("candidateId") ?? ""),
    jobId: String(formData.get("jobId") ?? ""),
    status: String(formData.get("status") ?? ""),
    interviewDate: String(formData.get("interviewDate") ?? ""),
    feedback: String(formData.get("feedback") ?? ""),
  });
  revalidatePath("/admin/isverenler");
  back("/admin/isverenler", ok ? "Eşleştirme kaydedildi. Sözleşme yoksa iş garantisi yoktur." : "Eşleştirme kaydedilemedi.");
}

export async function testimonialAction(formData: FormData) {
  const admin = await requirePanel();
  const ok = await createTestimonial(admin.profileId, {
    name: String(formData.get("name") ?? ""),
    city: String(formData.get("city") ?? ""),
    stage: String(formData.get("stage") ?? ""),
    body: String(formData.get("body") ?? ""),
    consent: formData.get("consent") === "on",
    representative: formData.get("representative") === "on",
  });
  revalidatePath("/admin/yorumlar");
  back("/admin/yorumlar", ok ? "Yorum taslak kaldı. Onaysız yayınlanmaz." : "Yorum kaydedilemedi.");
}

export async function approveStoryAction(formData: FormData) {
  const admin = await requirePanel();
  const id = String(formData.get("id") ?? "");
  const approve = formData.get("approve") === "yes";
  const ok = await approveTestimonial(admin.profileId, id, approve);
  revalidatePath("/admin/yorumlar");
  revalidatePath("/");
  back("/admin/yorumlar", ok ? (approve ? "Yayına alındı." : "Yayından alındı.") : "İzin yoksa veya temsili örnekse gerçek yorum olarak yayınlanmaz.");
}

export async function articleAction(formData: FormData) {
  const admin = await requirePanel();
  const ok = await saveArticle(admin.profileId, {
    slug: String(formData.get("slug") ?? ""),
    locale: String(formData.get("locale") ?? ""),
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    sourceUrl: String(formData.get("sourceUrl") ?? ""),
    sourceLabel: String(formData.get("sourceLabel") ?? ""),
    reviewedOn: String(formData.get("reviewedOn") ?? ""),
  });
  revalidatePath("/admin/icerik");
  back("/admin/icerik", ok ? "Taslak kaydedildi. Yayın için ayrıca onay gerekir." : "İçerik kaydedilemedi.");
}

export async function publishArticleAction(formData: FormData) {
  const admin = await requirePanel();
  const id = String(formData.get("id") ?? "");
  const ok = await publishArticle(admin.profileId, id, formData.get("publish") === "yes");
  revalidatePath("/admin/icerik");
  revalidatePath("/almanyada-soforluk");
  back("/admin/icerik", ok ? "Yayın durumu güncellendi." : "İçerik güncellenemedi.");
}

export async function requestHumanAction(input: unknown) {
  const gate = await publicGate("support", 6, 60 * 60);
  if (!gate.ok) return gate;
  if (!input || typeof input !== "object") return { ok: false as const, code: "invalid" as const };
  const row = input as Record<string, unknown>;
  if (typeof row.companyWebsite === "string" && row.companyWebsite.trim()) return { ok: true as const, publicCode: null };
  if (row.consent !== true) return { ok: false as const, code: "invalid" as const };
  const fullName = typeof row.fullName === "string" ? row.fullName : "";
  const message = typeof row.message === "string" ? row.message : "";
  const email = typeof row.email === "string" ? row.email : "";
  try {
    const result = await createSupportRequest({ fullName, message, email });
    if (!result.ok) return { ok: false as const, code: "invalid" as const };
    const inbox = contactInbox();
    if (inbox) {
      try {
        const id = await enqueueOutbound("email", {
          purpose: "staff",
          to: inbox,
          subject: "ROTA DE — Destek talebi",
          text: ["Destek talebi", "", `Kayıt: ${result.publicCode}`, `Ad soyad: ${fullName.trim().slice(0, 120)}`, email ? `E-posta: ${email.trim().slice(0, 180)}` : "", "", message.trim().slice(0, 2000)].filter(Boolean).join("\n"),
        });
        await settleOutbound(id);
      } catch (error) {
        console.error("outbound_enqueue_failed", { message: error instanceof Error ? error.message.slice(0, 180) : "unknown" });
      }
    }
    return { ok: true as const, publicCode: result.publicCode };
  } catch {
    return { ok: false as const, code: "unavailable" as const };
  }
}
