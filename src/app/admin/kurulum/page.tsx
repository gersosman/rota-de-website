import { redirect } from "next/navigation";
import { setupAction } from "@/server/actions/auth";
import { adminCount } from "@/server/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const instant = false;

const errors: Record<string, string> = {
  rate: "Çok fazla deneme.",
  anahtar: "Kurulum anahtarı geçersiz veya üretim ortamında tanımlı değil.",
  origin: "İstek bu siteden gelmiyor. Sayfayı yenileyip yeniden deneyin.",
  form: "Ad, e-posta ve parolayı kontrol edin. Parola en az 12 karakter, harf ve rakam içermelidir.",
  weak: "Parola en az 12 karakter olmalı ve harf ile rakam içermelidir.",
  exists: "Yönetici zaten var.",
  duplicate: "Bu e-posta kullanılamıyor.",
};

export default async function SetupPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if ((await adminCount()) > 0) redirect("/admin/giris");
  const params = await props.searchParams;
  const code = typeof params.hata === "string" ? params.hata : "";
  const locked = process.env.NODE_ENV === "production" && !process.env.ADMIN_SETUP_TOKEN?.trim();
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-16">
      <h1 className="font-serif text-4xl">İlk yönetici</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Bu ekran yalnızca hiç yönetici yokken açıktır. Üretimde `ADMIN_SETUP_TOKEN` olmadan kurulum kapalıdır.
        {process.env.NODE_ENV !== "production" ? " Geliştirme modunda anahtar boş bırakılabilir." : ""}
      </p>
      {locked ? <p className="mt-4 text-sm text-destructive">Üretim kurulumu kilitli. ADMIN_SETUP_TOKEN tanımlayın.</p> : null}
      <form action={setupAction} className="mt-6 grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="token">Kurulum anahtarı</Label>
          <Input id="token" name="token" type="password" className="h-11" autoComplete="off" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="displayName">Ad</Label>
          <Input id="displayName" name="displayName" required className="h-11" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="email">E-posta</Label>
          <Input id="email" name="email" type="email" required className="h-11" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">Parola</Label>
          <Input id="password" name="password" type="password" required minLength={12} className="h-11" />
        </div>
        {errors[code] ? <p className="text-sm text-destructive">{errors[code]}</p> : null}
        <Button type="submit" className="h-11" disabled={locked}>Yöneticiyi oluştur</Button>
      </form>
    </main>
  );
}
