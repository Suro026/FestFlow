import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

const ManageAdmins = () => {
  const [admins, setAdmins] = useState<any[]>([]);

  const loadAdmins = async () => {
    const snapshot = await getDocs(collection(db, "organizers"));

    const data = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    setAdmins(data);
  };

  const deleteAdmin = async (id: string) => {
    try {
      await deleteDoc(doc(db, "organizers", id));

      toast.success("Admin deleted");

      loadAdmins();
    } catch (error) {
      toast.error("Failed to delete admin");
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  return (
    <div className="p-10">
      <h1 className="text-4xl font-bold mb-8">
        Manage Admins
      </h1>

      <div className="space-y-4">
        {admins.map((admin) => (
          <div
            key={admin.id}
            className="border rounded-lg p-4 flex justify-between items-center"
          >
            <div>
              <h2 className="font-bold text-lg">
                {admin.fullName}
              </h2>

              <p>{admin.email}</p>

              <p>{admin.designation}</p>
            </div>

            <button
              onClick={() => deleteAdmin(admin.id)}
              className="bg-red-600 text-white px-4 py-2 rounded"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ManageAdmins;