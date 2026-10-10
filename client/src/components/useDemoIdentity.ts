import { useContext } from "react";
import { DemoIdentityContext } from "./DemoIdentityStore";

export function useDemoIdentity() {
  const context = useContext(DemoIdentityContext);
  if (!context) throw new Error("useDemoIdentity precisa ser usado dentro de DemoIdentityProvider.");
  return context;
}
