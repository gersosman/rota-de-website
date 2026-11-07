import cities from "@/data/cities.json";

export type CityRecord = { n: string; c: "DE" | "TR"; p: number };

const FOLD: Record<string, string> = {
  ı: "i",
  İ: "i",
  ş: "s",
  Ş: "s",
  ğ: "g",
  Ğ: "g",
  ü: "u",
  Ü: "u",
  ö: "o",
  Ö: "o",
  ç: "c",
  Ç: "c",
  ä: "a",
  Ä: "a",
  ß: "ss",
};

const LIST = (cities as CityRecord[]).map((city) => {
  const folded = foldCity(city.n);
  const digraph = foldCity(city.n.replace(/ä/gi, "ae").replace(/ö/gi, "oe").replace(/ü/gi, "ue").replace(/ß/g, "ss"));
  return { ...city, folded, digraph: digraph === folded ? "" : digraph };
});

export function foldCity(value: string): string {
  const lower = value.trim().toLocaleLowerCase("tr");
  const folded = [...lower].map((char) => FOLD[char] ?? char).join("");
  return folded.normalize("NFD").replace(/\p{M}/gu, "");
}

function byPopulation(left: CityRecord, right: CityRecord) {
  return right.p - left.p;
}

function nearPrefix(name: string, query: string) {
  if (query.length < 3 || name.length < query.length) return false;
  const stem = query.length - 1;
  return name.startsWith(query.slice(0, stem)) && name[stem] !== query[stem];
}

export function suggestCities(query: string, limit = 8): CityRecord[] {
  const folded = foldCity(query);
  if (folded.length < 2) return [];
  const prefix: CityRecord[] = [];
  const inside: CityRecord[] = [];
  const close: CityRecord[] = [];
  for (const city of LIST) {
    const names = city.digraph ? [city.folded, city.digraph] : [city.folded];
    if (names.some((name) => name.startsWith(folded))) prefix.push(city);
    else if (names.some((name) => name.includes(folded))) inside.push(city);
    else if (names.some((name) => nearPrefix(name, folded))) close.push(city);
  }
  prefix.sort(byPopulation);
  inside.sort(byPopulation);
  const anchor = prefix[0]?.c;
  close.sort((left, right) => Number(right.c === anchor) - Number(left.c === anchor) || byPopulation(left, right));
  const roomForClose = close.length > 0 ? Math.min(2, limit) : 0;
  const head = [...prefix, ...inside].slice(0, limit - roomForClose);
  const seen = new Set(head.map((city) => `${city.c}:${city.n}`));
  for (const city of close) {
    if (head.length >= limit) break;
    const key = `${city.c}:${city.n}`;
    if (seen.has(key)) continue;
    head.push(city);
  }
  return head.map(({ n, c, p }) => ({ n, c, p }));
}

export const CITY_SOURCE = "GeoNames DE and TR populated places, CC BY 4.0, stored in the project. No city lookup calls an external service.";
