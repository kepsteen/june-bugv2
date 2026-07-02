import { request } from './client';

export interface AppUser {
  id: string;
  authId: string;
  email?: string;
  isOnboarded: boolean;
  isAdmin: boolean;
  fullName?: string;
  age?: number;
  currentRole?: string;
  experienceLevel?: string;
  mentorshipStyle?: string;
  developmentGoals?: string[];
  techStack?: string[];
  workEnvironment?: string;
  journalingFrequency?: string;
  customScheduleDays?: string[];
  journalingTime?: string;
  notificationPreferences?: string[];
  createdAt: string;
  updatedAt: string;
}

export const appUsersApi = {
  getMe: () => request<{ data: AppUser }>('/api/app-users/me'),
  getOnboardingStatus: () =>
    request<{ data: { isOnboarded: boolean; user: AppUser | null } }>(
      '/api/app-users/onboarding/status',
    ),
  completeOnboarding: (data: { payload: Partial<AppUser> }) =>
    request<{ data: AppUser }>('/api/app-users/onboarding', {
      method: 'PUT',
      body: JSON.stringify(data.payload),
    }),
};
