import { createContext } from "react";
import type { DemoIdentity } from "../api";

export interface DemoIdentityContextValue {
  identities: DemoIdentity[];
  identity: DemoIdentity | null;
  identityId: number | null;
  isLoading: boolean;
  error: string | null;
  selectIdentity: (id: number) => void;
}

export const DemoIdentityContext = createContext<DemoIdentityContextValue | null>(null);
