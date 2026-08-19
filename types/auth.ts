export interface LoginCredentials {
  username: string;
  password: string;
  remember?: boolean;
}

export interface AuthSession {
  token: string;
  userId: string;
  expiresAt?: string;
}
