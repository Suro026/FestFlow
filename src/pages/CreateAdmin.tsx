import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";

const CreateAdmin = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [designation, setDesignation] = useState("");
  const [password, setPassword] = useState("");

  const createAdmin = async () => {
    try {
      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      const user = userCredential.user;

      await setDoc(
        doc(db, "organizers", user.uid),
        {
          uid: user.uid,
          fullName: name,
          email,
          designation,
          role: "admin",
          createdAt: serverTimestamp(),
        }
      );

      toast.success("Admin Created");

      setName("");
      setEmail("");
      setDesignation("");
      setPassword("");

    } catch (error: any) {
  console.log(error);
  toast.error(error.message);
}
  };

  return (
    <div className="p-10 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        Create Admin
      </h1>

      <div className="space-y-4">

        <input
          className="border p-3 w-full"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="border p-3 w-full"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="border p-3 w-full"
          placeholder="Designation"
          value={designation}
          onChange={(e) =>
            setDesignation(e.target.value)
          }
        />

        <input
          type="password"
          className="border p-3 w-full"
          placeholder="Password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
        />

        <button
          onClick={createAdmin}
          className="bg-red-600 text-white px-5 py-3 rounded"
        >
          Create Admin
        </button>

      </div>
    </div>
  );
};

export default CreateAdmin;