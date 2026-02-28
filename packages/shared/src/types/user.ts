export interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UserResponse = Omit<User, 'passwordHash'>;
