import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MfaForm } from "@/components/admin/mfa-form";
import { mfaScreen, RECOVERY_COOKIE, recoveryCodesFromCookie } from "@/lib/recovery-screen";
import { enrollmentPayload, getSession, requireMfaStage } from "@/server/auth";

export const instant = false;

const errors: Record<string, string> = {
  kod: "Kod doğrulanamadı.",
  rate: "Çok fazla deneme.",
  sunucu: "Doğrulama tamamlanamadı. Yeniden deneyin.",
};

export default async function MfaPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await props.searchParams;
  const code = typeof params.hata === "string" ? params.hata : "";
  const saved = (await cookies()).get(RECOVERY_COOKIE)?.value ?? "";
  const codes = recoveryCodesFromCookie(saved);
  if (mfaScreen(saved) === "recovery" && codes) {
    const session = await getSession();
    if (!session || session.role !== "admin") redirect("/admin/giris");
    return (
      <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-16">
        <p className="text-xs tracking-[0.16em] text-accent uppercase">İkinci adım</p>
        <h1 className="mt-3 font-serif text-4xl">Kurtarma kodları</h1>
        <div className="mt-6">
          <MfaForm mode="enroll" codes={codes} />
        </div>
      </main>
    );
  }
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
