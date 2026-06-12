import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, LogIn } from 'lucide-react';
import { toast } from 'sonner';

const StudentLogin = () => {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!studentId.trim()) {
      toast.error('Please enter your Student ID');
      return;
    }
    
    if (!password.trim()) {
      toast.error('Please enter your password');
      return;
    }

    setIsLoading(true);
    
    // Simulate login process
    setTimeout(() => {
      // Store student info in sessionStorage
      sessionStorage.setItem('studentId', studentId);
      sessionStorage.setItem('isLoggedIn', 'true');
      
      toast.success('Login successful!');
      navigate('/fests');
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-lighter via-background to-secondary p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
              <GraduationCap className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Student Portal</CardTitle>
          <CardDescription className="text-base">
            Sign in to access campus events and activities
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="studentId">Student ID</Label>
              <Input
                id="studentId"
                placeholder="Enter your Student ID"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
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
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              <LogIn className="h-4 w-4 mr-2" />
              {isLoading ? 'Signing in...' : 'Login'}
            </Button>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Don't have an account?</p>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => navigate('/student-register')}
              >
                Register →
              </Button>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => navigate('/admin-login')}
              >
                Admin Login →
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default StudentLogin;
