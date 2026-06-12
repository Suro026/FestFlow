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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-lighter via-background to-secondary p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-destructive flex items-center justify-center">
              <Shield className="h-10 w-10 text-destructive-foreground" />
            </div>
          </div>

          <CardTitle className="text-3xl font-bold">
            Admin Registration
          </CardTitle>

          <CardDescription className="text-base">
            Create an administrator account for event management
          </CardDescription>
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
    </div>
  );
};

export default AdminRegister;