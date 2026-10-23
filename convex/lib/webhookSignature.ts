/**
 * Verifies Resend (Svix) webhook signatures with WebCrypto, so it runs in the
 * default Convex runtime. The signed content is `${id}.${timestamp}.${body}`,
 * HMAC-SHA256 keyed by the base64 secret after the `whsec_` prefix.
 */

const TOLERANCE_SECONDS = 5 * 60;

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function signWebhookPayload(args: {
  secret: string;
  id: string;
  timestamp: string;
  body: string;
}): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    base64ToBytes(args.secret.replace(/^whsec_/, "")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${args.id}.${args.timestamp}.${args.body}`),
  );
  return bytesToBase64(new Uint8Array(signature));
}

export async function verifyWebhookSignature(args: {
  secret: string;
  id: string | null;
  timestamp: string | null;
  signature: string | null;
  body: string;
  nowSeconds: number;
}): Promise<boolean> {
  if (!args.id || !args.timestamp || !args.signature) {
    return false;
  }
  const timestamp = Number(args.timestamp);
  if (
    !Number.isFinite(timestamp) ||
    Math.abs(args.nowSeconds - timestamp) > TOLERANCE_SECONDS
  ) {
    return false;
  }
  const expected = await signWebhookPayload({
    secret: args.secret,
    id: args.id,
    timestamp: args.timestamp,
    body: args.body,
  });
  // The header holds space-separated `v1,<base64>` entries (one per active secret).
  return args.signature
    .split(" ")
    .map((entry) => entry.split(",", 2))
    .some(
      ([version, value]) =>
        version === "v1" && value !== undefined && constantTimeEqual(value, expected),
    );
}
