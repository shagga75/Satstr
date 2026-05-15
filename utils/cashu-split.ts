import { Wallet as CashuWallet, Proof, getEncodedToken } from "@cashu/cashu-ts";
import { PLATFORM_FEE_PERCENT, hasPlatformFee } from "./platform-config";
import { safeSwap } from "./cashu/swap-retry-service";

export interface SplitCashuPaymentResult {
  vendorToken: string;
  vendorProofs: Proof[];
  feeToken: string | null;
  remainingProofs: Proof[];
  vendorAmount: number;
  feeAmount: number;
}

/**
 * Splits a Cashu payment between the vendor and the platform operator.
 *
 * When NEXT_PUBLIC_PLATFORM_FEE_PUBKEY is set, takes PLATFORM_FEE_PERCENT
 * from totalAmount as a platform fee and returns the rest as the vendor token.
 * If the pubkey is not configured, the full amount goes to the vendor and
 * feeToken is null.
 */
export async function splitCashuPayment({
  totalAmount,
  wallet,
  inputProofs,
  mintUrl,
  vendorPubkey: _vendorPubkey,
}: {
  totalAmount: number;
  wallet: CashuWallet;
  inputProofs: Proof[];
  mintUrl: string;
  vendorPubkey?: string;
}): Promise<SplitCashuPaymentResult> {
  if (!hasPlatformFee()) {
    console.warn("Platform fee pubkey not configured, skipping fee");
    const swapOutcome = await safeSwap(wallet, totalAmount, inputProofs, {
      sendConfig: { includeFees: true },
    });
    if (swapOutcome.status !== "swapped") {
      throw new Error(
        swapOutcome.errorMessage ??
          `Vendor payment swap did not complete (${swapOutcome.status})`
      );
    }
    return {
      vendorToken: getEncodedToken({
        mint: mintUrl,
        proofs: swapOutcome.send,
      }),
      vendorProofs: swapOutcome.send,
      feeToken: null,
      remainingProofs: swapOutcome.keep,
      vendorAmount: totalAmount,
      feeAmount: 0,
    };
  }

  const vendorAmount = Math.floor(
    totalAmount * (1 - PLATFORM_FEE_PERCENT / 100)
  );
  const feeAmount = totalAmount - vendorAmount;
  let currentProofs = inputProofs;

  const vendorSwap = await safeSwap(wallet, vendorAmount, currentProofs, {
    sendConfig: { includeFees: true },
  });
  if (vendorSwap.status !== "swapped") {
    throw new Error(
      vendorSwap.errorMessage ??
        `Vendor payment swap did not complete (${vendorSwap.status})`
    );
  }
  const vendorProofs = vendorSwap.send;
  const vendorToken = getEncodedToken({ mint: mintUrl, proofs: vendorProofs });
  currentProofs = vendorSwap.keep;

  let feeToken: string | null = null;
  let remainingProofs = currentProofs;

  if (feeAmount > 0) {
    const feeSwap = await safeSwap(wallet, feeAmount, currentProofs, {
      sendConfig: { includeFees: true },
    });
    if (feeSwap.status !== "swapped") {
      console.warn(
        "Platform fee swap failed, proceeding without fee:",
        feeSwap.errorMessage
      );
    } else {
      feeToken = getEncodedToken({ mint: mintUrl, proofs: feeSwap.send });
      remainingProofs = feeSwap.keep;
    }
  }

  return {
    vendorToken,
    vendorProofs,
    feeToken,
    remainingProofs,
    vendorAmount,
    feeAmount,
  };
}
