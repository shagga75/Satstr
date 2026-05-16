import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Button, Spinner, Chip } from "@heroui/react";
import { nip19 } from "nostr-tools";
import {
  NostrContext,
  SignerContext,
} from "@/components/utility-components/nostr-context-provider";
import { useIsAdmin, useBannedPubkeys } from "@/components/hooks/useModeration";
import { getReports, banPubkey, unbanPubkey, Report } from "@/utils/moderation";
import { getLocalStorageData } from "@/utils/nostr/nostr-helper-functions";

function truncatePubkey(pubkey: string): string {
  try {
    const npub = nip19.npubEncode(pubkey);
    return npub.slice(0, 12) + "…" + npub.slice(-6);
  } catch {
    return pubkey.slice(0, 12) + "…";
  }
}

function formatTimestamp(ts: number): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleDateString();
}

export default function ModerationPage() {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const { nostr } = useContext(NostrContext);
  const { signer } = useContext(SignerContext);

  const {
    bannedUsers,
    bannedPubkeys,
    isLoading: isLoadingBans,
    reload,
  } = useBannedPubkeys();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/");
    }
  }, [isAdmin, router]);

  useEffect(() => {
    if (!nostr || !isAdmin) return;
    const { relays, readRelays } = getLocalStorageData();
    const allRelays = [...relays, ...readRelays];
    setIsLoadingReports(true);
    getReports(nostr, allRelays)
      .then((r) =>
        setReports(
          r.filter((rep) => !bannedPubkeys.includes(rep.reportedPubkey))
        )
      )
      .catch((err) => console.warn("Failed to load reports:", err))
      .finally(() => setIsLoadingReports(false));
  }, [nostr, isAdmin, bannedPubkeys]);

  const handleBan = async (pubkey: string, reason: string) => {
    if (!signer || !nostr) return;
    setActionInProgress(pubkey);
    try {
      await banPubkey(pubkey, reason, signer, nostr);
      reload();
    } catch (err) {
      console.error("Ban failed:", err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleUnban = async (pubkey: string) => {
    if (!signer || !nostr) return;
    setActionInProgress(pubkey);
    try {
      await unbanPubkey(pubkey, signer, nostr);
      reload();
    } catch (err) {
      console.error("Unban failed:", err);
    } finally {
      setActionInProgress(null);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="bg-light-bg dark:bg-dark-bg min-h-screen pt-20 pb-8">
      <div className="mx-auto max-w-3xl px-4">
        <h1 className="text-light-text dark:text-dark-text mb-6 text-2xl font-bold">
          Panel de moderación
        </h1>

        {/* Reports section */}
        <section className="mb-8">
          <h2 className="text-light-text dark:text-dark-text mb-3 text-lg font-semibold">
            Reportes pendientes
          </h2>
          {isLoadingReports ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : reports.length === 0 ? (
            <p className="text-light-text dark:text-dark-text opacity-60">
              No hay reportes pendientes.
            </p>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="bg-light-fg dark:bg-dark-fg rounded-lg p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1 text-sm">
                      <p className="text-light-text dark:text-dark-text">
                        <span className="font-medium">Reportado:</span>{" "}
                        <span className="font-mono">
                          {truncatePubkey(report.reportedPubkey)}
                        </span>
                      </p>
                      <p className="text-light-text dark:text-dark-text">
                        <span className="font-medium">Razón:</span>{" "}
                        {report.reason || (
                          <em className="opacity-60">sin razón</em>
                        )}
                      </p>
                      <p className="text-light-text dark:text-dark-text opacity-70">
                        <span className="font-medium">Reportado por:</span>{" "}
                        {truncatePubkey(report.reporterPubkey)}
                      </p>
                      <p className="text-light-text dark:text-dark-text opacity-70">
                        <span className="font-medium">Fecha:</span>{" "}
                        {formatTimestamp(report.timestamp)}
                      </p>
                      {report.reportedEventId && (
                        <p className="text-light-text dark:text-dark-text opacity-70">
                          <span className="font-medium">Evento:</span>{" "}
                          <span className="font-mono text-xs">
                            {report.reportedEventId.slice(0, 16)}…
                          </span>
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      color="danger"
                      isLoading={actionInProgress === report.reportedPubkey}
                      isDisabled={!!actionInProgress}
                      onClick={() =>
                        handleBan(report.reportedPubkey, report.reason)
                      }
                    >
                      Banear usuario
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Banned users section */}
        <section>
          <h2 className="text-light-text dark:text-dark-text mb-3 text-lg font-semibold">
            Usuarios baneados
          </h2>
          {isLoadingBans ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : bannedUsers.length === 0 ? (
            <p className="text-light-text dark:text-dark-text opacity-60">
              No hay usuarios baneados.
            </p>
          ) : (
            <div className="space-y-3">
              {bannedUsers.map((user) => (
                <div
                  key={user.pubkey}
                  className="bg-light-fg dark:bg-dark-fg rounded-lg p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1 text-sm">
                      <p className="text-light-text dark:text-dark-text font-mono">
                        {truncatePubkey(user.pubkey)}
                      </p>
                      <div className="flex items-center gap-2">
                        <Chip size="sm" color="danger" variant="flat">
                          Baneado
                        </Chip>
                        <span className="text-light-text dark:text-dark-text text-xs opacity-70">
                          {formatTimestamp(user.timestamp)}
                        </span>
                      </div>
                      {user.reason && (
                        <p className="text-light-text dark:text-dark-text opacity-80">
                          <span className="font-medium">Razón:</span>{" "}
                          {user.reason}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="flat"
                      isLoading={actionInProgress === user.pubkey}
                      isDisabled={!!actionInProgress}
                      onClick={() => handleUnban(user.pubkey)}
                    >
                      Desbanear
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
