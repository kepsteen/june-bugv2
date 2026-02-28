import { db } from '@/lib/db/index.js';
import { appUsers } from './app-users.table.js';
import { eq } from 'drizzle-orm';
import { NotFoundError } from '@/lib/errors/index.js';
import type { AppUser } from './app-users.table.js';

export const appUsersService = {
  async findByAuthId(authId: string): Promise<AppUser | null> {
    const [found] = await db.select().from(appUsers).where(eq(appUsers.authId, authId));
    return found ?? null;
  },

  async findById(id: string): Promise<AppUser | null> {
    const [found] = await db.select().from(appUsers).where(eq(appUsers.id, id));
    return found ?? null;
  },

  async findOrCreate(authId: string, email?: string): Promise<AppUser> {
    const existing = await this.findByAuthId(authId);
    if (existing) return existing;
    const [created] = await db.insert(appUsers).values({ authId, email }).returning();
    return created;
  },

  async updateOnboarding(authId: string, data: Partial<AppUser>): Promise<AppUser> {
    const [updated] = await db
      .update(appUsers)
      .set({ ...data, isOnboarded: true, updatedAt: new Date() })
      .where(eq(appUsers.authId, authId))
      .returning();
    if (!updated) throw new NotFoundError('User not found');
    return updated;
  },

  async getOnboardingStatus(authId: string): Promise<{ isOnboarded: boolean; user: AppUser | null }> {
    const user = await this.findByAuthId(authId);
    return { isOnboarded: user?.isOnboarded ?? false, user };
  },
};
