import { useState, useContext } from "react";
import { Button, Input } from "@heroui/react";
import { nip19 } from "nostr-tools";
import {
  generateKeys,
  constructGiftWrappedEvent,
  constructMessageSeal,
  constructMessageGiftWrap,
  sendGiftWrappedMessageEvent,
} from "@/utils/nostr/nostr-helper-functions";
import {
  NostrContext,
  SignerContext,
} from "@/components/utility-components/nostr-context-provider";

export type ShippingAddress = {
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type Props = {
  sellerPubkey: string;
  orderId: string;
  onSent?: () => void;
};

export default function ShippingAddressForm({
  sellerPubkey,
  orderId,
  onSent,
}: Props) {
  const { signer } = useContext(SignerContext);
  const { nostr } = useContext(NostrContext);

  const [fields, setFields] = useState<ShippingAddress>({
    name: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  });
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const isValid = Object.values(fields).every((v) => v.trim() !== "");

  const handleChange =
    (key: keyof ShippingAddress) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFields((prev) => ({ ...prev, [key]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer || !nostr || !isValid) return;

    setIsSending(true);
    setError("");
    try {
      const { nsec: nsecSender, npub: npubSender } = await generateKeys();
      const { nsec: nsecReceiver, npub: npubReceiver } = await generateKeys();
      const decodedSenderPub = nip19.decode(npubSender);
      const decodedSenderPriv = nip19.decode(nsecSender);
      const decodedReceiverPub = nip19.decode(npubReceiver);
      const decodedReceiverPriv = nip19.decode(nsecReceiver);

      const addressText =
        `Order: ${orderId.slice(0, 8)}\n` +
        `Name: ${fields.name}\n` +
        `Address: ${fields.address}\n` +
        `City: ${fields.city}\n` +
        `State/Province: ${fields.state}\n` +
        `Postal Code: ${fields.postalCode}\n` +
        `Country: ${fields.country}`;

      const wrapped = await constructGiftWrappedEvent(
        decodedSenderPub.data as string,
        sellerPubkey,
        addressText,
        "shipping-address",
        { isOrder: true, orderId }
      );

      const sealed = await constructMessageSeal(
        signer,
        wrapped,
        decodedSenderPub.data as string,
        sellerPubkey,
        decodedSenderPriv.data as Uint8Array
      );

      const giftWrapped = await constructMessageGiftWrap(
        sealed,
        decodedReceiverPub.data as string,
        decodedReceiverPriv.data as Uint8Array,
        sellerPubkey
      );

      await sendGiftWrappedMessageEvent(nostr, giftWrapped, signer);
      setSent(true);
      onSent?.();
    } catch (err) {
      console.error("Failed to send shipping address:", err);
      setError("Failed to send address. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  if (sent) {
    return (
      <p className="text-sm text-green-600 dark:text-green-400">
        ✓ Shipping address sent to seller.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="text-sm font-semibold">Shipping Address</h3>
      <Input
        variant="bordered"
        label="Full name"
        value={fields.name}
        onChange={handleChange("name")}
        isRequired
      />
      <Input
        variant="bordered"
        label="Street address"
        value={fields.address}
        onChange={handleChange("address")}
        isRequired
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          variant="bordered"
          label="City"
          value={fields.city}
          onChange={handleChange("city")}
          isRequired
        />
        <Input
          variant="bordered"
          label="State / Province"
          value={fields.state}
          onChange={handleChange("state")}
          isRequired
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          variant="bordered"
          label="Postal code"
          value={fields.postalCode}
          onChange={handleChange("postalCode")}
          isRequired
        />
        <Input
          variant="bordered"
          label="Country"
          value={fields.country}
          onChange={handleChange("country")}
          isRequired
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <Button
        type="submit"
        isLoading={isSending}
        isDisabled={!isValid || isSending}
        className="w-full"
        color="secondary"
      >
        Send address to seller
      </Button>
    </form>
  );
}
