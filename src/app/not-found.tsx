import Link from "next/link";
import { getDictionary } from "@/lib/i18n";

export const instant = false;

export default async function NotFound() {
  const copy = await getDictionary();
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-4">
      <h1 className="font-serif text-4xl">{copy.notFound.title}</h1>
      <p className="mt-3 text-muted-foreground">{copy.notFound.body}</p>
      <Link href="/" className="mt-6 text-sm text-accent">{copy.notFound.back}</Link>
    </main>
  );
}
