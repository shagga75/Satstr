import { EventTemplate } from "nostr-tools";
import { NostrManager } from "@/utils/nostr/nostr-manager";
import { NostrSigner } from "@/utils/nostr/signers/nostr-signer";
import { ADMIN_PUBKEY } from "@/utils/platform-config";
import { getLocalStorageData } from "@/utils/nostr/nostr-helper-functions";

export type Report = {
  id: string;
  reportedPubkey: string;
  reportedEventId?: string;
  reason: string;
  reporterPubkey: string;
  timestamp: number;
};

export type BannedUser = {
  pubkey: string;
  reason: string;
  timestamp: number;
};

export async function getBannedPubkeys(
  nostr: NostrManager,
  relays: string[]
): Promise<BannedUser[]> {
  if (!ADMIN_PUBKEY) return [];
  const events = await nostr.fetch(
    [{ kinds: [10000], authors: [ADMIN_PUBKEY], limit: 1 }],
    {},
    relays
  );
  if (!events.length) return [];
  const sorted = events.sort((a, b) => b.created_at - a.created_at);
  const latest = sorted[0];
  if (!latest) return [];
  return latest.tags
    .filter((t): t is string[] => t[0] === "satstr-ban" && !!t[1])
    .map((t) => ({
      pubkey: t[1] as string,
      reason: t[2] || "",
      timestamp: Number(t[3]) || 0,
    }));
}

export async function banPubkey(
  pubkey: string,
  reason: string,
  signer: NostrSigner,
  nostr: NostrManager
): Promise<void> {
  const { relays, writeRelays } = getLocalStorageData();
  const allRelays = [...relays, ...writeRelays];
  const adminPubkey = await signer.getPubKey();
  const existing = await nostr.fetch(
    [{ kinds: [10000], authors: [adminPubkey], limit: 1 }],
    {},
    allRelays
  );
  const latestEvent = existing.sort((a, b) => b.created_at - a.created_at)[0];
  const existingTags = latestEvent ? latestEvent.tags : [];
  const newTags = [
    ...existingTags.filter((t) => !(t[0] === "satstr-ban" && t[1] === pubkey)),
    ["satstr-ban", pubkey, reason, String(Math.floor(Date.now() / 1000))],
  ];
  const eventTemplate: EventTemplate = {
    kind: 10000,
    created_at: Math.floor(Date.now() / 1000),
    tags: newTags,
    content: "",
  };
  const signedEvent = await signer.sign(eventTemplate);
  await nostr.publish(signedEvent, allRelays);
}

export async function unbanPubkey(
  pubkey: string,
  signer: NostrSigner,
  nostr: NostrManager
): Promise<void> {
  const { relays, writeRelays } = getLocalStorageData();
  const allRelays = [...relays, ...writeRelays];
  const adminPubkey = await signer.getPubKey();
  const existing = await nostr.fetch(
    [{ kinds: [10000], authors: [adminPubkey], limit: 1 }],
    {},
    allRelays
  );
  const latestEvent = existing.sort((a, b) => b.created_at - a.created_at)[0];
  if (!latestEvent) return;
  const newTags = latestEvent.tags.filter(
    (t) => !(t[0] === "satstr-ban" && t[1] === pubkey)
  );
  const eventTemplate: EventTemplate = {
    kind: 10000,
    created_at: Math.floor(Date.now() / 1000),
    tags: newTags,
    content: "",
  };
  const signedEvent = await signer.sign(eventTemplate);
  await nostr.publish(signedEvent, allRelays);
}

export async function getReports(
  nostr: NostrManager,
  relays: string[]
): Promise<Report[]> {
  const events = await nostr.fetch([{ kinds: [1984], limit: 100 }], {}, relays);
  return events.map((e) => {
    const pTag = e.tags.find((t) => t[0] === "p");
    const eTag = e.tags.find((t) => t[0] === "e");
    return {
      id: e.id,
      reportedPubkey: pTag?.[1] ?? "",
      reportedEventId: eTag?.[1],
      reason: e.content,
      reporterPubkey: e.pubkey,
      timestamp: e.created_at,
    };
  });
}
