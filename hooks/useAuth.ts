import { useCallback, useState } from "react";
import { login as loginService, logout as logoutService } from "../services/auth";
import type { AuthSession, LoginCredentials } from "../types/auth";

export function useAuth() {
  const [session, setSession] = useState<AuthSession | null>(null);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const nextSession = await loginService(credentials);
    setSession(nextSession);
    return nextSession;
  }, []);

  const logout = useCallback(async () => {
    await logoutService();
    setSession(null);
  }, []);

  return {
    isAuthenticated: !!session,
    session,
    login,
    logout,
  };
}
