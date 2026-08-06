import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!email.trim()) {
    toast.error("Please enter email");
    return;
  }

  if (!password.trim()) {
    toast.error("Please enter password");
    return;
  }

  setIsLoading(true);

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;

    // Super Admin
    if (user.email === "superadmin@festflow.com") {
      sessionStorage.setItem("isSuperAdmin", "true");
      sessionStorage.setItem("adminId", user.email || "");
      toast.success("Super Admin Login Successful");
      navigate("/super-admin-dashboard");
      return;
    }

    // Normal Admin
    const adminRef = doc(db, "organizers", user.uid);
    const adminSnap = await getDoc(adminRef);

    if (!adminSnap.exists()) {
      toast.error("Admin account not found");
      return;
    }

    sessionStorage.setItem("isAdminLoggedIn", "true");
    sessionStorage.setItem("adminId", user.email || "");

    toast.success("Admin Login Successful");
    navigate("/admin-dashboard");

  } catch (error: any) {
    toast.error(error.message);
  } finally {
    setIsLoading(false);
  }
};

  return (
  <main className="flex min-h-screen flex-col bg-[#f9f9ff] md:flex-row">

    {/* LEFT PANEL */}

    <section className="relative hidden w-1/2 overflow-hidden bg-[#f0f3ff] px-24 py-12 md:flex md:flex-col md:justify-center">

      <div className="absolute right-0 top-1/4 h-64 w-64 rounded-full bg-gradient-to-br from-pink-600 to-indigo-600 opacity-10 blur-3xl" />

      <div className="absolute bottom-20 left-20 h-52 w-52 rounded-full bg-indigo-500 opacity-5 blur-3xl" />

      <div className="relative z-10 max-w-lg">

        <div className="mb-12 flex items-center gap-4">

          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-pink-600 to-indigo-600">

            <Shield className="h-7 w-7 text-white" />

          </div>

          <h1 className="text-3xl font-extrabold text-pink-700">
            FestFlow
          </h1>

        </div>

        <h2 className="text-5xl font-black leading-tight text-slate-900">

          Admin Portal

          <br />

          <span className="text-indigo-600">
            Manage with Precision
          </span>

        </h2>

        <p className="mt-8 max-w-md text-lg leading-8 text-slate-500">

          Seamlessly orchestrate campus events,

          monitor registrations,

          manage attendance,

          and empower your student community from one dashboard.

        </p>

        <div className="mt-12 grid grid-cols-2 gap-6">

          <div className="rounded-2xl border bg-white/70 p-6 backdrop-blur-xl">

            <h3 className="font-bold">
              Live Stats
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Real-time attendance tracking.
            </p>

          </div>

          <div className="rounded-2xl border bg-white/70 p-6 backdrop-blur-xl">

            <h3 className="font-bold">
              Secure Access
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Enterprise-grade authentication.
            </p>

          </div>

        </div>

      </div>

    </section>

    {/* RIGHT PANEL */}

    <section className="flex flex-1 items-center justify-center px-6 py-12">

      <div className="w-full max-w-md">

        <div className="mb-10">

          <h2 className="text-4xl font-extrabold">

            Admin Login

          </h2>

          <p className="mt-3 text-slate-500">

            Enter your credentials to continue.

          </p>

        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">

  {/* Email */}

  <div className="space-y-2">

    <label
      htmlFor="email"
      className="text-sm font-semibold text-slate-600"
    >
      Work Email
    </label>

    <input
      id="email"
      type="email"
      placeholder="name@college.edu"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      disabled={isLoading}
      className="w-full rounded-xl border border-slate-300 bg-white px-5 py-4 outline-none transition focus:border-pink-600 focus:ring-4 focus:ring-pink-100"
    />

  </div>

  {/* Password */}

  <div className="space-y-2">

    <div className="flex items-center justify-between">

      <label
        htmlFor="password"
        className="text-sm font-semibold text-slate-600"
      >
        Password
      </label>

      <button
        type="button"
        className="text-sm font-semibold text-pink-600 hover:underline"
      >
        Forgot Password?
      </button>

    </div>

    <input
      id="password"
      type="password"
      placeholder="••••••••"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      disabled={isLoading}
      className="w-full rounded-xl border border-slate-300 bg-white px-5 py-4 outline-none transition focus:border-pink-600 focus:ring-4 focus:ring-pink-100"
    />

  </div>

  <button
    type="submit"
    disabled={isLoading}
    className="flex h-14 w-full items-center justify-center rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 text-lg font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
  >
    <LogIn className="mr-2 h-5 w-5" />

    {isLoading ? "Signing In..." : "Login"}

  </button>

  <div className="border-t pt-8 text-center">

    <p className="text-slate-500">

      Need an admin account?

    </p>

    <button
      type="button"
      className="mt-4 font-semibold text-pink-600 hover:underline"
    >
      Contact Support
    </button>

    <div className="mt-6">

      <button
        type="button"
        onClick={() => navigate("/")}
        className="font-semibold text-indigo-600 hover:underline"
      >
        Home →
      </button>

    </div>

  </div>

</form>

      </div>

    </section>

  </main>
  );
};

export default AdminLogin;
