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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap,
  UserPlus,
  User,
  Mail,
  Phone,
  Badge,
  Building2,
  Calendar,
  Lock,
} from "lucide-react";
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

    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-indigo-50">
      <header className="sticky top-0 bg-white/80 backdrop-blur border-b">
  <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-20">

    <div className="flex items-center gap-3">

      <img
        src="/logo-re.png"
        className="h-12"
      />

      <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
        FestFlow
      </h1>

    </div>

    <Button
      variant="ghost"
      onClick={() => navigate("/student-login")}
    >
      Login
    </Button>

  </div>
</header>
     <div className="max-w-7xl mx-auto px-6 py-14">
      <div className="grid lg:grid-cols-2 gap-14 items-center">
        <div className="hidden lg:block">

<div className="space-y-8">
  <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 text-indigo-700 px-4 py-2 font-semibold">
Student Registration

</div>

<h1 className="text-5xl font-black leading-tight">

Start Your

<span className="block bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">

FestFlow Journey

</span>

</h1>

<p className="text-lg text-gray-600">
Join thousands of students participating in
college festivals, hackathons, technical events,
competitions and workshops through one smart
platform.
</p>

<div className="space-y-4 mt-8">

<div className="space-y-5 mt-10">

<div className="flex items-center gap-4 bg-white rounded-2xl p-5 shadow border">

<div>

<h4 className="font-bold">

Discover Events

</h4>

<p className="text-gray-500 text-sm">

Find hackathons, fests and competitions.

</p>

</div>

</div>

<div className="flex items-center gap-4 bg-white rounded-2xl p-5 shadow border">

<div>

<h4 className="font-bold">

Digital QR Ticket

</h4>

<p className="text-gray-500 text-sm">

Secure event entry with instant QR generation.

</p>

</div>

</div>

<div className="flex items-center gap-4 bg-white rounded-2xl p-5 shadow border">

<div>

<h4 className="font-bold">

Earn Certificates

</h4>

<p className="text-gray-500 text-sm">

Automatically receive verified certificates.

</p>

</div>

</div>

</div>

</div>

</div>
      </div>
      <Card className="rounded-[32px] border border-slate-200 shadow-xl bg-white/90 backdrop-blur">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
              <GraduationCap className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>

          <CardTitle className="text-3xl font-bold">
            Create Your Account
          </CardTitle>

          <CardDescription className="text-base">
            Register once and explore every campus event from a single platform.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleRegister}>
          <CardContent className="grid md:grid-cols-2 gap-5">
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
              className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:opacity-90 transition"
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

</div> 

</div>

  );
};

export default StudentRegister;