import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { AUTH_BASE } from "@/lib/api";

const TOKEN_KEY = "chitty_auth_token";

interface AuthUser {
  chittyId: string;
  name: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  register: (data: { name: string; email: string; biometricData: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(!!localStorage.getItem(TOKEN_KEY));

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("chitty_auth_user");
    setToken(null);
    setUser(null);
  }, []);

  // Validate saved token on mount
  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    const savedUser = localStorage.getItem("chitty_auth_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        // corrupted — will re-validate below
      }
    }

    fetch(`${AUTH_BASE}/v1/tokens/validate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.valid) {
          logout();
        }
      })
      .catch(() => {
        // Network error — keep token, user can retry
      })
      .finally(() => setIsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const register = useCallback(
    async (data: { name: string; email: string; biometricData: string }) => {
      const res = await fetch(`${AUTH_BASE}/v1/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
        throw new Error(err.error?.message || "Registration failed");
      }

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error?.message || "Registration failed");
      }

      const newToken = result.data?.token || result.token;
      const newUser: AuthUser = {
        chittyId: result.data?.chittyId || result.chittyId || "",
        name: data.name,
        email: data.email,
      };

      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem("chitty_auth_user", JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
