import { LightningAddress } from "@getalby/lightning-tools";
import {
  PLATFORM_FEE_PERCENT,
  PLATFORM_FEE_LN_ADDRESS,
  hasPlatformFee,
  hasPlatformFeeLN,
} from "./platform-config";

export interface SplitLightningPaymentResult {
  method: "webln-split" | "dual-invoice" | "no-fee";
  feeInvoice?: string;
  feeAmountSats?: number;
}

/**
 * Generates and optionally auto-pays a platform fee Lightning invoice.
 *
 * Requires both PLATFORM_FEE_PUBKEY and PLATFORM_FEE_LN_ADDRESS to be set.
 * If WebLN is available, attempts to pay the fee invoice automatically.
 * Falls back to returning the invoice for dual-QR display.
 */
export async function splitLightningPayment({
  totalSats,
}: {
  totalSats: number;
  vendorLightningAddress?: string;
}): Promise<SplitLightningPaymentResult> {
  if (!hasPlatformFee() || !hasPlatformFeeLN()) {
    return { method: "no-fee" };
  }

  const feeAmountSats = Math.ceil((totalSats * PLATFORM_FEE_PERCENT) / 100);

  const ln = new LightningAddress(PLATFORM_FEE_LN_ADDRESS!);
  await ln.fetch();
  const feeInvoiceObj = await ln.requestInvoice({ satoshi: feeAmountSats });
  const feeInvoice = feeInvoiceObj.paymentRequest;

  if (typeof window !== "undefined" && typeof window.webln !== "undefined") {
    try {
      await window.webln.enable();
      await window.webln.sendPayment(feeInvoice);
      return { method: "webln-split", feeAmountSats };
    } catch (e) {
      console.warn(
        "WebLN platform fee payment failed, showing dual-invoice:",
        e
      );
    }
  }

  return { method: "dual-invoice", feeInvoice, feeAmountSats };
}
