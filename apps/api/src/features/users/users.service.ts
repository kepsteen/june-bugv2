import crypto from 'node:crypto';
import { db } from '../../lib/db/index.js';
import { user } from '../auth/auth.table.js';
import type { CreateUserInput, UpdateUserInput, SelectUser } from './users.schema.js';
import { eq } from 'drizzle-orm';
import { NotFoundError, ConflictError } from '../../lib/errors/index.js';
import { wrapService } from '../../lib/service-wrapper.js';

const userServiceRaw = {
  /**
   * Find user by ID
   */
  async findById({ id }: { id: string }): Promise<SelectUser | null> {
    const [foundUser] = await db.select().from(user).where(eq(user.id, id));
    return foundUser ?? null;
  },

  /**
   * Find user by email
   */
  async findByEmail({ email }: { email: string }): Promise<SelectUser | null> {
    const [foundUser] = await db.select().from(user).where(eq(user.email, email));
    return foundUser ?? null;
  },

  /**
   * Update existing user
   * Validates email uniqueness if changing
   */
  async update({ id, data }: { id: string; data: UpdateUserInput }): Promise<SelectUser> {
    // Check email uniqueness if changing
    if (data.email) {
      const existing = await userServiceRaw.findByEmail({ email: data.email });
      if (existing && existing.id !== id) {
        throw new ConflictError('Email already in use');
      }
    }

    const [updated] = await db
      .update(user)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(user.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundError('User not found');
    }

    return updated;
  },

  /**
   * Create new user
   * Validates email uniqueness
   */
  async create({ data }: { data: CreateUserInput }): Promise<SelectUser> {
    const existing = await userServiceRaw.findByEmail({ email: data.email });
    if (existing) {
      throw new ConflictError('Email already in use');
    }

    const { password, ...userData } = data;
    const [newUser] = await db
      .insert(user)
      .values({ ...userData, id: crypto.randomUUID() })
      .returning();
    return newUser;
  },
};

export const userService = wrapService('userService', userServiceRaw);
