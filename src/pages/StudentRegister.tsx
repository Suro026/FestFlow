import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { GraduationCap, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
const StudentRegister = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    studentId: '',
    department: '',
    year: '',
    password: '',
    confirmPassword: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      toast.error('Please enter your full name');
      return;
    }

    if (!formData.email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    if (!formData.phone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    if (!formData.studentId.trim()) {
      toast.error('Please enter your Student ID');
      return;
    }

    if (!formData.department.trim()) {
      toast.error('Please enter your department');
      return;
    }

    if (!formData.year.trim()) {
      toast.error('Please enter your year');
      return;
    }

    if (!formData.password.trim()) {
      toast.error('Please enter your password');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);

try {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    formData.email,
    formData.password
  );

  const user = userCredential.user;

  await setDoc(doc(db, 'students', user.uid), {
    uid: user.uid,
    fullName: formData.fullName,
    email: formData.email,
    phone: formData.phone,
    studentId: formData.studentId,
    department: formData.department,
    year: formData.year,
    role: 'student',
    createdAt: serverTimestamp(),
  });

  toast.success('Registration successful!');
  navigate('/student-login');
} catch (error: any) {
  toast.error(error.message);
} finally {
  setIsLoading(false);
}
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-lighter via-background to-secondary p-4">
     <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
              <GraduationCap className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>

          <CardTitle className="text-3xl font-bold">
            Student Registration
          </CardTitle>

          <CardDescription className="text-base">
            Create your account to access campus events and activities
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="studentId">Student ID</Label>
              <Input
                id="studentId"
                placeholder="Enter your Student ID"
                value={formData.studentId}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                placeholder="Enter your department"
                value={formData.department}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                placeholder="Enter your year"
                value={formData.year}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {isLoading ? 'Creating Account...' : 'Register'}
            </Button>

            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => navigate('/student-login')}
            >
              Already have an account? Login →
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default StudentRegister;