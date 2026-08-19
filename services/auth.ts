import type { AuthSession, LoginCredentials } from "../types/auth";
import { getProfile, login as apiLogin, logout as apiLogout } from "./api";

export async function login(credentials: LoginCredentials): Promise<AuthSession> {
  const response = await apiLogin({
    username: credentials.username,
    password: credentials.password,
    device_name: "KlikPresensi Mobile",
  });

  return {
    token: response.token,
    userId: String(response.user.id),
    expiresAt: response.expires_at,
  };
}

export async function logout(): Promise<void> {
  await apiLogout();
}

export async function me() {
  return getProfile();
}
