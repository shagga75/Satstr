export const MARKETPLACE_NAME =
  process.env.NEXT_PUBLIC_MARKETPLACE_NAME || "Satstr";

export const PLATFORM_FEE_PERCENT = Number(
  process.env.NEXT_PUBLIC_PLATFORM_FEE_PERCENT ?? 3
);

export const PLATFORM_FEE_PUBKEY =
  process.env.NEXT_PUBLIC_PLATFORM_FEE_PUBKEY || null;

export const ADMIN_PUBKEY = process.env.NEXT_PUBLIC_ADMIN_PUBKEY || null;

export const PLATFORM_FEE_LN_ADDRESS =
  process.env.NEXT_PUBLIC_PLATFORM_FEE_LN_ADDRESS || null;

export function hasPlatformFeeLN(): boolean {
  return !!PLATFORM_FEE_LN_ADDRESS;
}

const DEFAULT_RELAY_LIST = [
  "wss://relay.damus.io",
  "wss://relay.nostr.band",
  "wss://nos.lol",
  "wss://relay.snort.social",
];

export const DEFAULT_RELAYS = process.env.NEXT_PUBLIC_DEFAULT_RELAYS
  ? process.env.NEXT_PUBLIC_DEFAULT_RELAYS.split(",")
      .map((r) => r.trim())
      .filter(Boolean)
  : DEFAULT_RELAY_LIST;

export function hasPlatformFee(): boolean {
  return !!PLATFORM_FEE_PUBKEY;
}
