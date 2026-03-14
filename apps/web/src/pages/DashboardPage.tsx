import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth-client';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function DashboardPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Name</p>
            <p className="font-medium">{user.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
