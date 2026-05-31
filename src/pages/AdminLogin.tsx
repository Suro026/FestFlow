import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, LogIn } from 'lucide-react';
import { toast } from 'sonner';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!username.trim()) {
      toast.error('Please enter your username');
      return;
    }
    
    if (!password.trim()) {
      toast.error('Please enter your password');
      return;
    }

    setIsLoading(true);
    
    // Simulate login process
    setTimeout(() => {
      // Store admin info in sessionStorage
      sessionStorage.setItem('adminId', username);
      sessionStorage.setItem('isAdminLoggedIn', 'true');
      
      toast.success('Admin login successful!');
      navigate('/admin-dashboard');
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-lighter via-background to-secondary p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-destructive flex items-center justify-center">
              <Shield className="h-10 w-10 text-destructive-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Admin Portal</CardTitle>
          <CardDescription className="text-base">
            Sign in to manage campus events and registrations
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Enter admin username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" size="lg" disabled={isLoading} variant="destructive">
              <LogIn className="h-4 w-4 mr-2" />
              {isLoading ? 'Signing in...' : 'Login as Admin'}
            </Button>
            
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Demo: Use any username and password
              </p>
              <div>
                <p className="text-sm text-muted-foreground">Don't have an account?</p>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => navigate('/admin-register')}
                >
                  Register as Admin →
                </Button>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => navigate('/student-login')}
                >
                  Student Login →
                </Button>
              </div>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default AdminLogin;
