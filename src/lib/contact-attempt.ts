const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createContactIdempotencyKey(randomUUID: () => string = () => crypto.randomUUID()): string {
  const id = randomUUID();
  if (!UUID.test(id)) throw new Error("contact_key_invalid");
  return `contact-${id}`;
}

export function createContactAttempt(randomUUID?: () => string) {
  let key: string | null = null;
  return {
    prepare() {
      key ??= createContactIdempotencyKey(randomUUID);
      return key;
    },
  };
}
