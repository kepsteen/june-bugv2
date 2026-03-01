import { db } from '@/lib/db/index.js';
import { appUsers } from './app-users.table.js';
import { eq } from 'drizzle-orm';
import { NotFoundError } from '@/lib/errors/index.js';
import { wrapService } from '@/lib/service-wrapper.js';
import type { AppUser } from './app-users.table.js';

const appUsersServiceRaw = {
  async findByAuthId({ authId }: { authId: string }): Promise<AppUser | null> {
    const [found] = await db.select().from(appUsers).where(eq(appUsers.authId, authId));
    return found ?? null;
  },

  async findById({ id }: { id: string }): Promise<AppUser | null> {
    const [found] = await db.select().from(appUsers).where(eq(appUsers.id, id));
    return found ?? null;
  },

  async findOrCreate({ authId, email }: { authId: string; email?: string }): Promise<AppUser> {
    const existing = await appUsersServiceRaw.findByAuthId({ authId });
    if (existing) return existing;
    const [created] = await db.insert(appUsers).values({ authId, email }).returning();
    return created;
  },

  async updateOnboarding({ authId, data }: { authId: string; data: Partial<AppUser> }): Promise<AppUser> {
    const [updated] = await db
      .update(appUsers)
      .set({ ...data, isOnboarded: true, updatedAt: new Date() })
      .where(eq(appUsers.authId, authId))
      .returning();
    if (!updated) throw new NotFoundError('User not found');
    return updated;
  },

  async getOnboardingStatus({ authId }: { authId: string }): Promise<{ isOnboarded: boolean; user: AppUser | null }> {
    const user = await appUsersServiceRaw.findByAuthId({ authId });
    return { isOnboarded: user?.isOnboarded ?? false, user };
  },
};

export const appUsersService = wrapService('appUsersService', appUsersServiceRaw);
