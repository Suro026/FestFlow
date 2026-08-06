import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const StudentLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }

  if (!password.trim()) {
    toast.error("Please enter your password");
    return;
  }

  setIsLoading(true);

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const studentDoc = await getDoc(doc(db, 'students', userCredential.user.uid));
    const studentData = studentDoc.exists() ? studentDoc.data() : null;

    sessionStorage.setItem("studentUid", userCredential.user.uid);
    sessionStorage.setItem("studentEmail", userCredential.user.email ?? "");
    sessionStorage.setItem("isLoggedIn", "true");

    if (studentData?.studentId) {
      sessionStorage.setItem("studentId", studentData.studentId);
    } else {
      sessionStorage.setItem("studentId", userCredential.user.uid);
    }

    toast.success("Login successful!");
    navigate("/fests");
  } catch (error: any) {
    switch (error.code) {
      case "auth/invalid-credential":
        toast.error("Invalid email or password");
        break;

      case "auth/user-not-found":
        toast.error("Student account not found");
        break;

      case "auth/wrong-password":
        toast.error("Incorrect password");
        break;

      default:
        toast.error(error.message);
    }
  } finally {
    setIsLoading(false);
  }
};

  return (
   <main className="flex min-h-screen w-full overflow-hidden bg-[#f9f9ff]">

     {/* LEFT SIDE */}
     <section className="relative hidden flex-1 overflow-hidden bg-gradient-to-br from-pink-700 via-fuchsia-600 to-indigo-700 lg:flex">

      <div className="absolute inset-0 opacity-20">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-400 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col justify-center px-16 text-white">

        <div className="mb-10 flex items-center gap-4">

          <div className="rounded-2xl bg-white/20 p-4 backdrop-blur-md">
            <GraduationCap className="h-10 w-10" />
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight">
            FestFlow
          </h1>

        </div>

        <h2 className="text-6xl font-black leading-tight">

          Experience the

          <br />

          <span className="text-pink-200">
            Vibrant Motion
          </span>

          <br />

          of Campus Life.

        </h2>

        <p className="mt-8 max-w-xl text-xl leading-9 text-white/90">

          Welcome back, Student!

          Your gateway to workshops,

          hackathons,

          college fests,

          seminars,

          and campus events starts here.

        </p>

        <div className="mt-12 flex gap-5">

          <div className="rounded-2xl border border-white/20 bg-white/15 px-8 py-6 backdrop-blur-xl">

            <p className="text-sm uppercase tracking-widest text-white/70">
              Active Events
            </p>

            <h3 className="mt-2 text-3xl font-bold">
              24+
            </h3>

          </div>

          <div className="rounded-2xl border border-white/20 bg-white/15 px-8 py-6 backdrop-blur-xl">

            <p className="text-sm uppercase tracking-widest text-white/70">
              Tickets
            </p>

            <h3 className="mt-2 text-3xl font-bold">
              12K+
            </h3>

          </div>

        </div>

      </div>

     </section>

     {/* RIGHT SIDE */}

     <section className="flex flex-1 items-center justify-center bg-[#f9f9ff] px-6 py-12">

      <div className="w-full max-w-md">

        <div className="mb-10">

          <h2 className="text-4xl font-extrabold">
            Student Login
          </h2>

          <p className="mt-3 text-gray-500">
            Please sign in to continue.
          </p>

        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">

  <div className="space-y-2">

    <label
      htmlFor="email"
      className="text-sm font-semibold text-gray-600"
    >
      Email
    </label>

    <input
      id="email"
      type="email"
      placeholder="student@college.edu"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      disabled={isLoading}
      className="w-full rounded-xl border border-gray-300 bg-white px-5 py-4 outline-none transition-all focus:border-pink-600 focus:ring-2 focus:ring-pink-200"
    />

  </div>

  <div className="space-y-2">

    <div className="flex items-center justify-between">

      <label
        htmlFor="password"
        className="text-sm font-semibold text-gray-600"
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
      className="w-full rounded-xl border border-gray-300 bg-white px-5 py-4 outline-none transition-all focus:border-pink-600 focus:ring-2 focus:ring-pink-200"
    />

  </div>

  <div className="flex items-center gap-3">

    <input
      id="remember"
      type="checkbox"
      className="h-5 w-5 rounded"
    />

    <label
      htmlFor="remember"
      className="text-sm text-gray-600"
    >
      Remember this device
    </label>

  </div>

  <button
    type="submit"
    disabled={isLoading}
    className="flex h-14 w-full items-center justify-center rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 text-lg font-bold text-white transition hover:opacity-90 disabled:opacity-60"
  >
    {isLoading ? "Signing In..." : "Sign In to Dashboard"}
  </button>

  <div className="border-t pt-8 text-center">

    <p className="mb-5 text-gray-500">
      Don't have a FestFlow account?
    </p>

    <button
      type="button"
      onClick={() => navigate("/student-register")}
      className="w-full rounded-xl border-2 border-pink-600 py-3 font-bold text-pink-600 transition hover:bg-pink-50"
    >
      Create New Account
    </button>

    <button
      type="button"
      onClick={() => navigate("/")}
      className="mt-5 text-sm font-semibold text-indigo-600 hover:underline"
    >
      Home →
    </button>

  </div>

</form>

      </div>

    </section>

  </main>
  );
};

export default StudentLogin;
