import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { AuthResponse } from "../types/auth";
import { login as apiLogin, refreshSession } from "../api/authApi";
import type { LoginRequest } from "../types/auth";
import i18n, { normalizeLocale, LOCALE_STORAGE_KEY } from "../i18n";

interface AuthState {
  token: string;
  email: string;
  fullName: string;
  role: string;
  emailConfirmed: boolean;
  notificationsEnabled: boolean;
  activatedAt: string | null;
  trialDays: number;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  companyId: number | null;
  locale: string;
  commsLocale: string;
}

interface AuthContextValue {
  user: AuthState | null;
  login: (req: LoginRequest) => Promise<void>;
  logout: () => void;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "procureportal_auth";

function loadAuth(): AuthState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthState;
  } catch {
    return null;
  }
}

function saveAuth(auth: AuthState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

function clearAuth() {
  localStorage.removeItem(STORAGE_KEY);
}

// Server locale wins over any prior client detection so a user logging in from
// a shared machine sees their own preference, not the previous user's.
function syncI18nLocale(rawLocale: string | null | undefined) {
  const normalized = normalizeLocale(rawLocale);
  if (i18n.language !== normalized) {
    void i18n.changeLanguage(normalized);
  }
  localStorage.setItem(LOCALE_STORAGE_KEY, normalized);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthState | null>(loadAuth);

  useEffect(() => {
    if (user) saveAuth(user);
    else clearAuth();
  }, [user]);

  // Refresh session metadata on mount so trial expiry / subscription changes
  // take effect without requiring a re-login. Never the security gate — the API
  // strips locked payloads regardless — this just keeps the UI honest.
  useEffect(() => {
    if (user) {
      refreshSession()
        .then(({ activatedAt, trialDays, subscriptionStatus, trialEndsAt, companyId, locale, commsLocale }) => {
          setUser((prev) => prev ? { ...prev, activatedAt, trialDays, subscriptionStatus, trialEndsAt, companyId, locale, commsLocale } : prev);
          syncI18nLocale(locale);
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(req: LoginRequest) {
    const res: AuthResponse = await apiLogin(req);
    setUser({
      token: res.token,
      email: res.email,
      fullName: res.fullName,
      role: res.role,
      emailConfirmed: res.emailConfirmed,
      notificationsEnabled: res.notificationsEnabled,
      activatedAt: res.activatedAt,
      trialDays: res.trialDays,
      subscriptionStatus: res.subscriptionStatus,
      trialEndsAt: res.trialEndsAt,
      companyId: res.companyId,
      locale: res.locale,
      commsLocale: res.commsLocale,
    });
    syncI18nLocale(res.locale);
  }

  function logout() {
    setUser(null);
  }

  function getToken() {
    return user?.token ?? null;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
