import type { User } from './user';

export interface Session {
  user: User;
  expiresAt: Date;
}

export interface AuthResponse {
  user: User;
  session: Session;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  name: string;
}
