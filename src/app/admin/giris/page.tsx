import Link from "next/link";
import { adminCount } from "@/server/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const instant = false;

const errors: Record<string, string> = {
  giris: "E-posta veya parola hatalı.",
  rate: "Çok fazla deneme. Bir süre sonra yeniden deneyin.",
  origin: "İstek bu siteden gelmiyor.",
};

export default async function LoginPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await props.searchParams;
  const code = typeof params.hata === "string" ? params.hata : "";
  const admins = await adminCount();
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-16">
      <p className="font-serif text-3xl">ROTA <span className="text-accent">DE</span></p>
      <h1 className="mt-6 text-xl">Yönetici girişi</h1>
      <p className="mt-2 text-sm text-muted-foreground">Panele yalnızca yetkili yönetici girer. Oturum çerezi tarayıcı betiğinden okunamaz.</p>
      {admins === 0 ? (
        <p className="mt-4 text-sm">
          Henüz yönetici yok. <Link className="text-accent" href="/admin/kurulum">İlk kurulumu açın.</Link>
        </p>
      ) : null}
      <form action="/api/admin/oturum" method="post" className="mt-6 grid gap-4">
        <input type="hidden" name="islem" value="giris" />
        <div className="grid gap-1.5">
          <Label htmlFor="email">E-posta</Label>
          <Input id="email" name="email" type="email" autoComplete="username" required className="h-11" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">Parola</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required className="h-11" />
        </div>
        {errors[code] ? <p className="text-sm text-destructive">{errors[code]}</p> : null}
        <Button type="submit" className="h-11">Giriş</Button>
      </form>
    </main>
  );
}
