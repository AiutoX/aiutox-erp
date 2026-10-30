/**
 * PINGate — Authentication wrapper for AiutoX Field App.
 *
 * Decision tree:
 *  1. No ERP JWT in localStorage → redirect to /login?redirect=/field
 *  2. JWT present, no PIN configured → show PINSetup
 *  3. JWT present, PIN configured, not yet verified this session → show PINLogin
 *  4. All OK (pinVerified) → render children
 *
 * Session expiry check: if the stored sessionExpiry is in the past,
 * the user must re-authenticate via ERP login.
 */
import { useEffect, type ReactNode } from "react";
import { hasPINConfigured } from "../../lib/pin";
import { useFieldAuthStore } from "../../stores/field-auth.store";
import { PINLogin } from "./PINLogin";
import { PINSetup } from "./PINSetup";

interface PINGateProps {
  children: ReactNode;
}

/** Read ERP auth from shared localStorage key (set by useAuthStore). */
function getERPAuth(): {
  userId: string;
  tenantId: string;
  sessionExpiry: number;
} | null {
  try {
    const raw = localStorage.getItem("auth-storage");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const user = parsed?.state?.user;
    const token = parsed?.state?.token ?? localStorage.getItem("auth_token");
    if (!user?.id || !user?.tenant_id || !token) return null;

    // Decode JWT exp without a library
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    const expMs = (payload.exp ?? 0) * 1000;
    if (expMs < Date.now()) return null; // token expired

    return { userId: user.id, tenantId: user.tenant_id, sessionExpiry: expMs };
  } catch {
    return null;
  }
}

export function PINGate({ children }: PINGateProps) {
  const { pinVerified, userId, sessionExpiry, setPinVerified, clearSession } =
    useFieldAuthStore();

  const erpAuth = getERPAuth();

  // If no valid ERP JWT → redirect to login
  useEffect(() => {
    if (!erpAuth) {
      clearSession();
      window.location.href = "/login?redirect=/field";
    }
  }, [erpAuth, clearSession]);

  if (!erpAuth) {
    // Show nothing while redirect happens
    return null;
  }

  // Check if stored session is still valid
  if (sessionExpiry !== null && sessionExpiry < Date.now()) {
    clearSession();
    window.location.href = "/login?redirect=/field";
    return null;
  }

  // PIN not yet configured for this user → setup flow
  if (!hasPINConfigured(erpAuth.userId)) {
    return (
      <PINSetup
        userId={erpAuth.userId}
        onDone={() =>
          setPinVerified(
            erpAuth.userId,
            erpAuth.tenantId,
            erpAuth.sessionExpiry
          )
        }
      />
    );
  }

  // PIN configured but not verified this session
  if (!pinVerified || userId !== erpAuth.userId) {
    return (
      <PINLogin
        userId={erpAuth.userId}
        onSuccess={() =>
          setPinVerified(
            erpAuth.userId,
            erpAuth.tenantId,
            erpAuth.sessionExpiry
          )
        }
      />
    );
  }

  // All good
  return <>{children}</>;
}
