import { useContext, useEffect, useState } from "react";
import {
  NostrContext,
  SignerContext,
} from "@/components/utility-components/nostr-context-provider";
import { ADMIN_PUBKEY } from "@/utils/platform-config";
import { getBannedPubkeys, BannedUser } from "@/utils/moderation";
import { getLocalStorageData } from "@/utils/nostr/nostr-helper-functions";

export function useBannedPubkeys(): {
  bannedUsers: BannedUser[];
  bannedPubkeys: string[];
  isLoading: boolean;
  reload: () => void;
} {
  const { nostr } = useContext(NostrContext);
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!nostr || !ADMIN_PUBKEY) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { relays, readRelays } = getLocalStorageData();
    const allRelays = [...relays, ...readRelays];
    getBannedPubkeys(nostr, allRelays)
      .then((users) => setBannedUsers(users))
      .catch((err) => console.warn("Failed to load banned pubkeys:", err))
      .finally(() => setIsLoading(false));
  }, [nostr, tick]);

  return {
    bannedUsers,
    bannedPubkeys: bannedUsers.map((u) => u.pubkey),
    isLoading,
    reload: () => setTick((t) => t + 1),
  };
}

export function useIsAdmin(): boolean {
  const { pubkey } = useContext(SignerContext);
  if (!ADMIN_PUBKEY || !pubkey) return false;
  return pubkey === ADMIN_PUBKEY;
}
