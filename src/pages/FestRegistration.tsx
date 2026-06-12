import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { toast } from "sonner";

const FestRegistration = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    festName: "",
    festDescription: "",
    organizationName: "",
    location: "",
    startDate: "",
    endDate: "",
    contactEmail: "",
    contactPhone: "",
    publishFest: true
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const user = auth.currentUser;

    if (!user) {
      toast.error("Please login again");
      return;
    }

    setIsLoading(true);

    try {
      await updateDoc(doc(db, "organizers", user.uid), {
        role: "super_admin",

        festName: formData.festName,
        festDescription: formData.festDescription,
        organizationName: formData.organizationName,
        location: formData.location,
        startDate: formData.startDate,
        endDate: formData.endDate,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,

        festPublished: formData.publishFest,
      });

      toast.success("Fest Registered Successfully");

      sessionStorage.setItem("isSuperAdmin", "true");

      navigate("/super-admin-dashboard");
    } catch (error) {
      console.error(error);
      toast.error("Failed to register fest");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8">

        <h1 className="text-4xl font-bold mb-2">
          Register Your Fest
        </h1>

        <p className="text-gray-500 mb-8">
          Complete the details below to create your fest and become the Super Admin.
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div>
            <label className="font-medium">
              Fest Name
            </label>

            <input
              type="text"
              name="festName"
              value={formData.festName}
              onChange={handleChange}
              required
              className="w-full border rounded-lg p-3 mt-2"
            />
          </div>

          <div>
            <label className="font-medium">
              Fest Description
            </label>

            <textarea
              name="festDescription"
              value={formData.festDescription}
              onChange={handleChange}
              rows={4}
              required
              className="w-full border rounded-lg p-3 mt-2"
            />
          </div>

          <div>
            <label className="font-medium">
              Organization / College Name
            </label>

            <input
              type="text"
              name="organizationName"
              value={formData.organizationName}
              onChange={handleChange}
              required
              className="w-full border rounded-lg p-3 mt-2"
            />
          </div>

          <div>
            <label className="font-medium">
              Location
            </label>

            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              className="w-full border rounded-lg p-3 mt-2"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="font-medium">
                Start Date
              </label>

              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
                className="w-full border rounded-lg p-3 mt-2"
              />
            </div>

            <div>
              <label className="font-medium">
                End Date
              </label>

              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                required
                className="w-full border rounded-lg p-3 mt-2"
              />
            </div>
          </div>

          <div>
            <label className="font-medium">
              Contact Email
            </label>

            <input
              type="email"
              name="contactEmail"
              value={formData.contactEmail}
              onChange={handleChange}
              required
              className="w-full border rounded-lg p-3 mt-2"
            />
          </div>

          <div>
            <label className="font-medium">
              Contact Phone
            </label>

            <input
              type="text"
              name="contactPhone"
              value={formData.contactPhone}
              onChange={handleChange}
              required
              className="w-full border rounded-lg p-3 mt-2"
            />
          </div>
          <div className="flex items-center gap-3">
  <input
    type="checkbox"
    checked={formData.publishFest}
    onChange={(e) =>
      setFormData({
        ...formData,
        publishFest: e.target.checked,
      })
    }
  />

  <label>
    Publish Fest Immediately
  </label>
</div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-red-600 text-white py-4 rounded-xl font-semibold hover:bg-red-700"
          >
            {isLoading
              ? "Creating Fest..."
              : "Create Fest & Become Super Admin"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FestRegistration;