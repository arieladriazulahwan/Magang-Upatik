import type { AuthSession, LoginCredentials } from "../types/auth";

export async function login(credentials: LoginCredentials): Promise<AuthSession> {
  return {
    token: "demo-token",
    userId: credentials.username || "demo-user",
  };
}

export async function logout(): Promise<void> {
  return;
}
