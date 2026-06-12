import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";

const SuperAdminDashboard = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [totalAdmins, setTotalAdmins] = useState(0);
const [totalEvents, setTotalEvents] = useState(0);
const [totalParticipants, setTotalParticipants] = useState(0);
const [festName, setFestName] = useState("");

useEffect(() => {
  const loadDashboardData = async () => {
    try {
      // Admin Count
      const adminSnapshot = await getDocs(
        query(
          collection(db, "organizers"),
          where("role", "==", "admin")
        )
      );

      setTotalAdmins(adminSnapshot.size);

      // Event Count
      const eventSnapshot = await getDocs(
        collection(db, "events")
      );

      setTotalEvents(eventSnapshot.size);

      // Participant Count
      const registrationSnapshot = await getDocs(
        collection(db, "eventRegistrations")
      );

      setTotalParticipants(registrationSnapshot.size);

      // Fest Name
      const superAdminSnapshot = await getDocs(
        query(
          collection(db, "organizers"),
          where("role", "==", "super_admin")
        )
      );

      if (!superAdminSnapshot.empty) {
        setFestName(
          superAdminSnapshot.docs[0].data().festName || "FestFlow"
        );
      }

    } catch (error) {
      console.error(error);
    }
  };

  loadDashboardData();
}, []);

  return (
    <div className="flex min-h-screen">

      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white p-6">

        <h1 className="text-2xl font-bold mb-8">
          FestFlow
        </h1>

        <div className="space-y-2">

          <button
            onClick={() => setActiveTab("dashboard")}
            className="w-full text-left px-4 py-3 rounded hover:bg-slate-800"
          >
            Dashboard
          </button>

          <button
            onClick={() => navigate("/manage-admins")}
            className="w-full text-left px-4 py-3 rounded hover:bg-slate-800"
          >
            Admins
          </button>

          <button
            onClick={() => setActiveTab("events")}
            className="w-full text-left px-4 py-3 rounded hover:bg-slate-800"
          >
            Events
          </button>

          <button
            onClick={() => setActiveTab("attendance")}
            className="w-full text-left px-4 py-3 rounded hover:bg-slate-800"
          >
            Attendance
          </button>

          <button
            onClick={() => setActiveTab("certificates")}
            className="w-full text-left px-4 py-3 rounded hover:bg-slate-800"
          >
            Certificates
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className="w-full text-left px-4 py-3 rounded hover:bg-slate-800"
          >
            Analytics
          </button>

        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-10 bg-gray-50">

        {activeTab === "dashboard" && (
          <>
            <h1 className="text-4xl font-bold mb-2">
  {festName || "Fest Dashboard"}
</h1>

<p className="text-gray-500 mb-8">
  Super Admin Control Panel
</p>
<div className="mt-8 flex gap-4">

  <button
    onClick={() => navigate("/create-admin")}
    className="bg-red-600 text-white px-6 py-3 rounded"
  >
    Create Admin
  </button>

  <button
    onClick={() => navigate("/manage-admins")}
    className="bg-blue-600 text-white px-6 py-3 rounded"
  >
    Manage Admins
  </button>

</div>

            <div className="grid md:grid-cols-3 gap-6">

              <div className="bg-white p-6 rounded-xl shadow">
                <h3 className="text-gray-500">
                  Total Admins
                </h3>

                <p className="text-3xl font-bold">
                  {totalAdmins}
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow">
                <h3 className="text-gray-500">
                  Total Events
                </h3>

                <p className="text-3xl font-bold">
                  {totalEvents}
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow">
                <h3 className="text-gray-500">
                  Participants
                </h3>

                <p className="text-3xl font-bold">
                  {totalParticipants}
                </p>
              </div>

            </div>
          </>
        )}

        {activeTab === "events" && (
          <h1 className="text-4xl font-bold">
            Events
          </h1>
        )}

        {activeTab === "attendance" && (
          <h1 className="text-4xl font-bold">
            Attendance
          </h1>
        )}

        {activeTab === "certificates" && (
          <h1 className="text-4xl font-bold">
            Certificates
          </h1>
        )}

        {activeTab === "analytics" && (
          <h1 className="text-4xl font-bold">
            Analytics
          </h1>
        )}

      </div>
    </div>
  );
};

export default SuperAdminDashboard;