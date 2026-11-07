import { cookies } from "next/headers";
import { enrollmentPayload, requireMfaStage } from "@/server/auth";
import { MfaForm } from "@/components/admin/mfa-form";

export const instant = false;

const errors: Record<string, string> = {
  kod: "Kod doğrulanamadı.",
  rate: "Çok fazla deneme.",
  sunucu: "Doğrulama tamamlanamadı. Yeniden deneyin.",
};

export default async function MfaPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await props.searchParams;
  const code = typeof params.hata === "string" ? params.hata : "";
  const jar = await cookies();
  const saved = jar.get("rota_recovery")?.value ?? "";
  if (saved) jar.delete("rota_recovery");
  const codes = saved ? saved.split(",").filter(Boolean) : null;
  const session = await requireMfaStage();
  const enrollment = session.mfaEnabled ? null : await enrollmentPayload(session.profileId, session.email);
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-16">
      <p className="text-xs tracking-[0.16em] text-accent uppercase">İkinci adım</p>
      <h1 className="mt-3 font-serif text-4xl">{session.mfaEnabled ? "Doğrulama" : "Kimlik doğrulayıcı"}</h1>
      <div className="mt-6">
        <MfaForm
          mode={session.mfaEnabled ? "verify" : "enroll"}
          secret={enrollment?.secret}
          qrDataUrl={enrollment?.qrDataUrl}
          codes={codes}
          error={errors[code] ?? null}
        />
      </div>
    </main>
  );
}
