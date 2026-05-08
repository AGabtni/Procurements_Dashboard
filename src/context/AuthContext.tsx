import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { AuthResponse } from "../types/auth";
import { login as apiLogin } from "../api/authApi";
import type { LoginRequest } from "../types/auth";

interface AuthState {
  token: string;
  email: string;
  fullName: string;
  role: string;
  emailConfirmed: boolean;
  notificationsEnabled: boolean;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthState | null>(loadAuth);

  useEffect(() => {
    if (user) saveAuth(user);
    else clearAuth();
  }, [user]);

  async function login(req: LoginRequest) {
    const res: AuthResponse = await apiLogin(req);
    setUser({
      token: res.token,
      email: res.email,
      fullName: res.fullName,
      role: res.role,
      emailConfirmed: res.emailConfirmed,
      notificationsEnabled: res.notificationsEnabled,
    });
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
