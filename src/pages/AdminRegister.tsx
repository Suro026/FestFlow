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
import { Shield, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const AdminRegister = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    adminId: '',
    designation: '',
    secretKey: '',
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

    if (!formData.name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!formData.email.trim()) {
      toast.error('Please enter your email');
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

  await setDoc(doc(db, "organizers", user.uid), {
    uid: user.uid,
    fullName: formData.name,
    email: formData.email,
    phone: formData.phone,
    designation: formData.designation,
    role: "organizer",
    createdAt: serverTimestamp(),
  });

  toast.success("Organizer account created successfully!");
  navigate("/fest-registration");

} catch (error: any) {
  switch (error.code) {
    case "auth/email-already-in-use":
      toast.error("Email already registered");
      break;

    case "auth/weak-password":
      toast.error("Password should be at least 6 characters");
      break;

    default:
      toast.error(error.message);
  }
} finally {
  setIsLoading(false);
}
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f9f9ff]">
      <>
  {/* Background Blur Shapes */}
  <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-pink-500/20 blur-[100px]" />
  <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-indigo-500/20 blur-[100px]" />

  {/* Top Navigation */}
  <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-slate-200/40 bg-white/80 px-6 backdrop-blur-md">
    <div className="flex items-center gap-2">
      <Shield className="h-8 w-8 text-pink-600" />
      <span className="text-2xl font-extrabold tracking-tight text-pink-600">
        FestFlow
      </span>
    </div>

    <div className="hidden items-center gap-8 md:flex">
      <button
        type="button"
        className="text-sm font-medium text-slate-500 transition hover:text-pink-600"
      >
        Documentation
      </button>

      <button
        type="button"
        className="text-sm font-medium text-slate-500 transition hover:text-pink-600"
      >
        Support
      </button>

      <div className="h-6 w-px bg-slate-300" />

      <button
        type="button"
        onClick={() => navigate("/admin-login")}
        className="text-sm font-semibold text-pink-600"
      >
        Sign In
      </button>
    </div>
  </header>
</>
      <main className="relative z-10 mx-auto mt-24 mb-16 flex w-full max-w-7xl flex-col gap-12 px-6 lg:flex-row lg:items-start">

  {/* Left Panel */}
  {/* Left Panel */}
<section className="w-full pt-8 lg:w-5/12">
  <div className="mb-8">
    <span className="inline-block rounded-full bg-pink-100 px-4 py-1.5 text-sm font-semibold text-pink-600">
      ADMIN PORTAL
    </span>

    <h1 className="mt-5 text-5xl font-extrabold leading-tight tracking-tight text-slate-900">
      Empower your event
      <br />
      <span className="italic text-pink-600">
        management team.
      </span>
    </h1>

    <p className="mt-5 max-w-md text-lg leading-8 text-slate-500">
      Join the ecosystem where efficiency meets creativity.
      Register as an administrator to start orchestrating
      unforgettable campus experiences.
    </p>
  </div>

  <div className="space-y-4">
    <div className="rounded-2xl border border-white/40 bg-white/80 p-6 shadow-lg backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-100">
          <Shield className="h-6 w-6 text-pink-600" />
        </div>

        <div>
          <h3 className="font-semibold text-slate-900">
            Live Analytics
          </h3>

          <p className="text-sm text-slate-500">
            Real-time tracking of registration metrics.
          </p>
        </div>
      </div>
    </div>

    <div className="rounded-2xl border border-white/40 bg-white/80 p-6 shadow-lg backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
          <Shield className="h-6 w-6 text-indigo-600" />
        </div>

        <div>
          <h3 className="font-semibold text-slate-900">
            Secure Infrastructure
          </h3>

          <p className="text-sm text-slate-500">
            Enterprise-grade data protection.
          </p>
        </div>
      </div>
    </div>
  </div>
</section>

  {/* Right Panel */}
  <section className="w-full lg:w-7/12">
    <Card className="overflow-hidden rounded-[2rem] border border-white/40 bg-white/80 shadow-2xl backdrop-blur-xl">
        <CardHeader className="relative space-y-6 border-b border-slate-200/50 px-10 pt-10 pb-8">
          <div className="flex items-center justify-between">
  <div>
    <h2 className="text-3xl font-bold tracking-tight text-slate-900">
      Create Admin Account
    </h2>

    <p className="mt-2 text-sm text-slate-500">
      Step 1 of 3: Organization Details
    </p>
  </div>

  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-pink-100">
    <Shield className="h-7 w-7 text-pink-600" />
  </div>
</div>
</CardHeader>

        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Enter full name"
                value={formData.name}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>


            <div className="space-y-2">
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                placeholder="Enter designation"
                value={formData.designation}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
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
                placeholder="Confirm password"
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
              variant="destructive"
              disabled={isLoading}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {isLoading ? 'Creating Account...' : 'Register as Admin'}
            </Button>

            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => navigate('/admin-login')}
            >
              Already have an account? Login →
            </Button>
          </CardFooter>
        </form>
      </Card>
      </section>
      </main>
    </div>
  );
};

export default AdminRegister;