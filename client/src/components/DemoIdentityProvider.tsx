import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDemoIdentities } from "../api";
import { DemoIdentityContext, type DemoIdentityContextValue } from "./DemoIdentityStore";

const STORAGE_KEY = "marketplace-demo-user-id";

function readStoredIdentity(): number | null {
  try {
    const value = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function DemoIdentityProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedId] = useState<number | null>(readStoredIdentity);
  const identitiesQuery = useQuery({ queryKey: ["demo-identities"], queryFn: getDemoIdentities, staleTime: 5 * 60_000 });
  const identities = useMemo(() => identitiesQuery.data?.data ?? [], [identitiesQuery.data]);
  const preferredIdentity = identities.find((item) => item.providerProfileId === null) ?? identities[0] ?? null;
  const identity = identities.find((item) => item.id === selectedId) ?? (identitiesQuery.isSuccess ? preferredIdentity : null);

  useEffect(() => {
    if (!identity || selectedId === identity.id) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(identity.id));
    } catch {
      // The current tab still retains the default identity in context.
    }
  }, [identity, selectedId]);

  const selectIdentity = useCallback((id: number) => {
    if (!identities.some((item) => item.id === id)) return;
    setSelectedId(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      // Keep the selected identity in memory for this session.
    }
  }, [identities]);

  const value = useMemo<DemoIdentityContextValue>(() => ({
    identities,
    identity,
    identityId: identity?.id ?? null,
    isLoading: identitiesQuery.isPending,
    error: identitiesQuery.isError
      ? identitiesQuery.error.message
      : identitiesQuery.isSuccess && identities.length === 0
        ? "Não há identidades demonstrativas disponíveis."
        : null,
    selectIdentity,
  }), [identities, identity, identitiesQuery.isPending, identitiesQuery.isError, identitiesQuery.error, identitiesQuery.isSuccess, selectIdentity]);

  return <DemoIdentityContext.Provider value={value}>{children}</DemoIdentityContext.Provider>;
}
