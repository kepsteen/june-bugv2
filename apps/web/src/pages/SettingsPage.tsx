import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { MemoriesTab } from '@/components/settings/MemoriesTab';
import { useSession, signOut } from '@/lib/auth-client';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, User, Sparkles, CreditCard } from 'lucide-react';
import { useGetCurrentAppUserQuery, useSubscriptionQuery } from '@/hooks/api';
import { isActiveSubscription, type AppUser } from '@/lib/api';

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function ProfileCard({ user, appUser }: { user: { name?: string | null; email?: string | null; image?: string | null } | undefined; appUser: AppUser | undefined }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center gap-3">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? 'User'} />
            <AvatarFallback className="text-lg">
              {user?.name ? getInitials(user.name) : <User className="h-6 w-6" />}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <p className="font-semibold">{user?.name ?? 'Unknown'}</p>
            <p className="text-sm text-muted-foreground">{user?.email ?? ''}</p>
          </div>
        </div>

        {appUser?.isOnboarded && (
          <>
            <Separator />
            <div className="space-y-3">
              {appUser.fullName && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Full Name
                  </p>
                  <p className="text-sm mt-0.5">{appUser.fullName}</p>
                </div>
              )}
              {appUser.currentRole && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Role
                  </p>
                  <p className="text-sm mt-0.5">{appUser.currentRole}</p>
                </div>
              )}
              {appUser.experienceLevel && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Experience Level
                  </p>
                  <Badge variant="secondary" className="mt-0.5">
                    {appUser.experienceLevel}
                  </Badge>
                </div>
              )}
              {appUser.workEnvironment && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Work Environment
                  </p>
                  <p className="text-sm mt-0.5">{appUser.workEnvironment}</p>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function SettingsPage() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: appUserData } = useGetCurrentAppUserQuery({
    enabled: !!session?.user,
  });

  const { data: subscriptionData } = useSubscriptionQuery({
    enabled: !!session?.user,
  });

  const appUser = appUserData?.data;
  const isPro = isActiveSubscription(subscriptionData?.data);
  const user = session?.user;

  const handleSignOut = async () => {
    await signOut();
    queryClient.clear();
    navigate('/sign-in');
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Back link */}
        <Link
          to="/entries"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to entries
        </Link>

        {/* Header row */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Settings</h1>
          <div className="flex items-center gap-2">
            {isPro ? (
              <Button asChild variant="outline">
                <Link to="/settings/billing">
                  <CreditCard className="h-4 w-4" />
                  Manage billing
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                className="border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
              >
                <Link to="/upgrade">
                  <Sparkles className="h-4 w-4" />
                  Upgrade to Pro
                </Link>
              </Button>
            )}
            <ThemeToggle />
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-6 items-start">
          {/* Left column - Profile card */}
          <div className="w-[300px] shrink-0">
            <ProfileCard user={user} appUser={appUser} />
          </div>

          {/* Right column - Settings card with tabs */}
          <div className="flex-1 min-w-0">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>
                  Manage your profile, preferences, notifications, and memories.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="profile">
                  <TabsList className="mb-6">
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="preferences">Preferences</TabsTrigger>
                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    <TabsTrigger value="memories">Memories</TabsTrigger>
                  </TabsList>

                  <TabsContent value="profile" className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium mb-1">Display Name</h3>
                      <p className="text-sm text-muted-foreground">
                        {user?.name ?? 'Not set'}
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-medium mb-1">Email Address</h3>
                      <p className="text-sm text-muted-foreground">
                        {user?.email ?? 'Not set'}
                      </p>
                    </div>
                    {appUser?.isOnboarded && appUser.fullName && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="text-sm font-medium mb-1">Full Name</h3>
                          <p className="text-sm text-muted-foreground">{appUser.fullName}</p>
                        </div>
                      </>
                    )}
                    {appUser?.currentRole && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="text-sm font-medium mb-1">Current Role</h3>
                          <p className="text-sm text-muted-foreground">{appUser.currentRole}</p>
                        </div>
                      </>
                    )}
                    {appUser?.techStack && appUser.techStack.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="text-sm font-medium mb-2">Tech Stack</h3>
                          <div className="flex flex-wrap gap-1.5">
                            {appUser.techStack.map((tech) => (
                              <Badge key={tech} variant="outline">
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="preferences" className="space-y-4">
                    {appUser?.mentorshipStyle && (
                      <div>
                        <h3 className="text-sm font-medium mb-1">Learning Style</h3>
                        <p className="text-sm text-muted-foreground">{appUser.mentorshipStyle}</p>
                      </div>
                    )}
                    {appUser?.journalingFrequency && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="text-sm font-medium mb-1">Journaling Frequency</h3>
                          <p className="text-sm text-muted-foreground">
                            {appUser.journalingFrequency}
                          </p>
                        </div>
                      </>
                    )}
                    {appUser?.journalingTime && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="text-sm font-medium mb-1">Preferred Time</h3>
                          <p className="text-sm text-muted-foreground">{appUser.journalingTime}</p>
                        </div>
                      </>
                    )}
                    {appUser?.developmentGoals && appUser.developmentGoals.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="text-sm font-medium mb-2">Development Goals</h3>
                          <ul className="space-y-1">
                            {appUser.developmentGoals.map((goal) => (
                              <li key={goal} className="text-sm text-muted-foreground flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                {goal}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                    {!appUser?.isOnboarded && (
                      <p className="text-sm text-muted-foreground">
                        Complete onboarding to configure your preferences.
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="notifications" className="space-y-4">
                    {appUser?.notificationPreferences && appUser.notificationPreferences.length > 0 ? (
                      <div>
                        <h3 className="text-sm font-medium mb-2">Active Notifications</h3>
                        <ul className="space-y-1">
                          {appUser.notificationPreferences.map((pref) => (
                            <li key={pref} className="text-sm text-muted-foreground flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                              {pref}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No notification preferences configured.
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="memories">
                    <MemoriesTab />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
