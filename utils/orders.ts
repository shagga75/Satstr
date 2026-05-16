import { nip19 } from "nostr-tools";
import {
  generateKeys,
  constructGiftWrappedEvent,
  constructMessageSeal,
  constructMessageGiftWrap,
  sendGiftWrappedMessageEvent,
} from "@/utils/nostr/nostr-helper-functions";
import { NostrSigner } from "@/utils/nostr/signers/nostr-signer";
import { NostrManager } from "@/utils/nostr/nostr-manager";
import { NostrMessageEvent } from "@/utils/types/types";

export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "completed"
  | "disputed"
  | "refunded";

export type OrderEvent = {
  id: string;
  orderId: string;
  status: OrderStatus;
  message?: string;
  trackingNumber?: string;
  timestamp: number;
  authorPubkey: string;
};

export async function publishOrderUpdate(
  orderId: string,
  status: OrderStatus,
  message: string,
  trackingNumber: string | undefined,
  signer: NostrSigner,
  recipientPubkey: string,
  nostr: NostrManager
): Promise<void> {
  const { nsec: nsecForSender, npub: npubForSender } = await generateKeys();
  const { nsec: nsecForReceiver, npub: npubForReceiver } = await generateKeys();

  const decodedSenderPubkey = nip19.decode(npubForSender);
  const decodedSenderPrivkey = nip19.decode(nsecForSender);
  const decodedReceiverPubkey = nip19.decode(npubForReceiver);
  const decodedReceiverPrivkey = nip19.decode(nsecForReceiver);

  const shortId = orderId.slice(0, 8);
  const notificationText = message
    ? `Tu orden ${shortId} fue actualizada: ${status} - ${message}`
    : `Tu orden ${shortId} fue actualizada: ${status}`;

  const giftWrappedMessageEvent = await constructGiftWrappedEvent(
    decodedSenderPubkey.data as string,
    recipientPubkey,
    notificationText,
    "order-update",
    {
      isOrder: true,
      orderId,
      status,
      ...(trackingNumber ? { tracking: trackingNumber } : {}),
    }
  );

  const sealedEvent = await constructMessageSeal(
    signer,
    giftWrappedMessageEvent,
    decodedSenderPubkey.data as string,
    recipientPubkey,
    decodedSenderPrivkey.data as Uint8Array
  );

  const giftWrappedEvent = await constructMessageGiftWrap(
    sealedEvent,
    decodedReceiverPubkey.data as string,
    decodedReceiverPrivkey.data as Uint8Array,
    recipientPubkey
  );

  await sendGiftWrappedMessageEvent(nostr, giftWrappedEvent, signer);
}

// Accepts decoded NostrMessageEvent[] (from ChatsContext) since NIP-17 DMs
// can only be read after decryption — raw relay fetching won't work here.
export function getOrderHistory(
  orderId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pool: any,
  _relays: string[]
): OrderEvent[] {
  const messages: NostrMessageEvent[] = Array.isArray(pool) ? pool : [];

  const orderStatuses: OrderStatus[] = [
    "pending",
    "paid",
    "processing",
    "shipped",
    "completed",
    "disputed",
    "refunded",
  ];

  return messages
    .filter((msg) => {
      const orderTag = msg.tags?.find((t) => t[0] === "order");
      return orderTag && orderTag[1] === orderId;
    })
    .map((msg) => {
      const statusTag = msg.tags?.find((t) => t[0] === "status");
      const trackingTag = msg.tags?.find((t) => t[0] === "tracking");
      const rawStatus = statusTag?.[1] ?? "pending";
      const status: OrderStatus = (
        orderStatuses.includes(rawStatus as OrderStatus) ? rawStatus : "pending"
      ) as OrderStatus;

      return {
        id: msg.id,
        orderId,
        status,
        message: msg.content || undefined,
        trackingNumber: trackingTag?.[1],
        timestamp: msg.created_at,
        authorPubkey: msg.pubkey,
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}
