import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";

const navItems: Array<{ key: string; label: string; icon: string; to?: string }> = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "admins", label: "Admins", icon: "supervisor_account", to: "/manage-admins" },
  { key: "events", label: "Events", icon: "event" },
  { key: "attendance", label: "Attendance", icon: "how_to_reg" },
  { key: "certificates", label: "Certificates", icon: "card_membership" },
  { key: "analytics", label: "Analytics", icon: "analytics" },
];

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
        const adminSnapshot = await getDocs(
          query(collection(db, "organizers"), where("role", "==", "admin"))
        );
        setTotalAdmins(adminSnapshot.size);

        const eventSnapshot = await getDocs(collection(db, "events"));
        setTotalEvents(eventSnapshot.size);

        const registrationSnapshot = await getDocs(collection(db, "eventRegistrations"));
        setTotalParticipants(registrationSnapshot.size);

        const superAdminSnapshot = await getDocs(
          query(collection(db, "organizers"), where("role", "==", "super_admin"))
        );

        if (!superAdminSnapshot.empty) {
          setFestName(superAdminSnapshot.docs[0].data().festName || "Fest Dashboard");
        }
      } catch (error) {
        console.error(error);
      }
    };

    loadDashboardData();
  }, []);

  const handleNavClick = (item: (typeof navItems)[number]) => {
    if (item.to) {
      navigate(item.to);
      return;
    }

    setActiveTab(item.key);
  };

  const adminRows = [
    {
      name: "Alex Rivera",
      email: "alex.r@festflow.com",
      department: "Cultural Affairs",
      access: "Full Access",
      status: "Active",
      accent: "bg-[#f5ecff] text-[#5b3bb5]",
      dot: "bg-emerald-500",
    },
    {
      name: "Maya Chen",
      email: "m.chen@festflow.com",
      department: "Marketing",
      access: "Events Only",
      status: "Active",
      accent: "bg-[#ecfdf5] text-[#0f766e]",
      dot: "bg-emerald-500",
    },
    {
      name: "Jordan Smyth",
      email: "jordan.s@festflow.com",
      department: "Student Union",
      access: "Limited",
      status: "Inactive",
      accent: "bg-[#eef2ff] text-[#475569]",
      dot: "bg-slate-400",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f4f6ff] text-slate-900">
      <style>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.74);
          border: 1px solid rgba(15, 23, 42, 0.06);
          backdrop-filter: blur(12px);
          box-shadow: 0 12px 30px -24px rgba(15, 23, 42, 0.18);
        }
        .brand-gradient {
          background: linear-gradient(135deg, #ec4899 0%, #b10e6b 100%);
        }
        .vibrant-shadow {
          box-shadow: 0 20px 35px -18px rgba(177, 14, 107, 0.4);
        }
      `}</style>

      <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between px-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-4 md:ml-64">
            <h1 className="text-[1.9rem] font-extrabold tracking-[-0.04em] text-[#b10e6b]">FestFlow</h1>
            <div className="hidden md:flex items-center gap-2 rounded-full border border-slate-200 bg-[#f1f3ff] px-3 py-2 shadow-sm">
              <span className="material-symbols-outlined text-base text-slate-400">search</span>
              <input
                type="text"
                placeholder="Search events or admins..."
                className="w-64 border-0 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-0"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100">
              <span className="material-symbols-outlined">settings</span>
            </button>
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-[#f9d7e7] bg-[#f6d9ea]">
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80"
                alt="Super admin avatar"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </header>

      <aside className="fixed left-0 top-0 hidden h-full w-64 flex-col border-r border-slate-200 bg-[#f1f3fb] pb-8 pt-20 md:flex">
        <div className="px-4 pb-6">
          <h2 className="text-[2rem] font-extrabold leading-none tracking-[-0.04em] text-[#b10e6b]">
            FestFlow Admin
          </h2>
          <p className="mt-2 text-sm text-slate-500">Super Admin Portal</p>
        </div>

        <nav className="mt-2 flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = activeTab === item.key && !item.to;
            return (
              <button
                key={item.key}
                onClick={() => handleNavClick(item)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[0.9rem] font-bold transition-all duration-200 ${
                  isActive
                    ? "bg-[#d8d8ff] text-[#2b2b62]"
                    : "text-slate-600 hover:bg-slate-200/80"
                }`}
              >
                <span className="material-symbols-outlined text-[1.05rem]">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-slate-200 px-3 pt-4">
          <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-slate-600 transition hover:bg-slate-200/80">
            <span className="material-symbols-outlined text-[1.05rem]">help</span>
            Help Center
          </button>
          <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-red-600 transition hover:bg-red-50">
            <span className="material-symbols-outlined text-[1.05rem]">logout</span>
            Logout
          </button>
        </div>
      </aside>

      <main className="pb-24 pt-24 md:ml-64 md:pb-12">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6 lg:px-8">
          {activeTab === "dashboard" && (
            <>
              <div className="mb-6 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                <div>
                  <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-slate-800 md:text-4xl">
                    {festName || "Fest Dashboard"}
                  </h1>
                  <p className="mt-2 text-base text-slate-500">Super Admin Control Panel</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => navigate("/create-admin")}
                    className="brand-gradient vibrant-shadow flex items-center gap-2 rounded-full px-5 py-3 text-base font-bold text-white transition hover:brightness-110 active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-lg">person_add</span>
                    Create New Admin
                  </button>
                  <button
                    onClick={() => navigate("/manage-admins")}
                    className="rounded-full border border-[#e2d4ef] bg-[#f5f1ff] px-5 py-3 text-base font-bold text-[#b10e6b] transition hover:bg-[#efe5ff] active:scale-[0.98]"
                  >
                    Manage Permissions
                  </button>
                </div>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="glass-card rounded-[28px] p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ede9fe] text-[#4f46e5]">
                      <span className="material-symbols-outlined">shield_person</span>
                    </div>
                    <span className="rounded-full bg-[#effaf3] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#0f766e]">
                      +2 this month
                    </span>
                  </div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Total Admins
                  </p>
                  <h3 className="text-4xl font-extrabold tracking-[-0.04em] text-slate-800">{totalAdmins}</h3>
                </div>

                <div className="glass-card relative overflow-hidden rounded-[28px] p-6">
                  <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#fbe9f4] blur-2xl" />
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fce7f3] text-[#b10e6b]">
                      <span className="material-symbols-outlined">calendar_today</span>
                    </div>
                    <span className="rounded-full bg-[#fff1f2] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#be123c]">
                      4 live now
                    </span>
                  </div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Total Events
                  </p>
                  <h3 className="text-4xl font-extrabold tracking-[-0.04em] text-slate-800">{totalEvents}</h3>
                </div>

                <div className="glass-card rounded-[28px] p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ebfdf8] text-[#0f766e]">
                      <span className="material-symbols-outlined">groups</span>
                    </div>
                    <div className="flex -space-x-2">
                      {[
                        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
                        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
                      ].map((src, index) => (
                        <div key={src} className={`flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border-2 border-white ${index === 0 ? "bg-[#e2e8f0]" : "bg-[#f9d7e7]"}`}>
                          <img src={src} alt="Participant" className="h-full w-full object-cover" />
                        </div>
                      ))}
                      <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#b10e6b] text-[8px] font-bold text-white">
                        +22
                      </div>
                    </div>
                  </div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Participants
                  </p>
                  <h3 className="text-4xl font-extrabold tracking-[-0.04em] text-slate-800">{totalParticipants}</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2.2fr_1fr]">
                <div className="glass-card rounded-[30px] p-5 md:p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-2xl font-extrabold tracking-[-0.04em] text-slate-800">Recent Administrators</h2>
                    <button className="text-sm font-extrabold text-[#b10e6b] hover:underline" onClick={() => navigate("/manage-admins")}>
                      View All
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200/80">
                    <table className="w-full border-collapse text-left">
                      <thead className="bg-slate-50/80">
                        <tr className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          <th className="px-4 py-3">Administrator</th>
                          <th className="px-4 py-3">Department</th>
                          <th className="px-4 py-3">Access Level</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminRows.map((row) => (
                          <tr key={row.name} className="border-t border-slate-200 bg-white/30">
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-[#f3e8ff]">
                                  <img
                                    src={row.name === "Alex Rivera" ? "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80" : row.name === "Maya Chen" ? "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80" : "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80"}
                                    alt={row.name}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                                <div>
                                  <div className="font-bold text-slate-800">{row.name}</div>
                                  <div className="text-xs text-slate-500">{row.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-slate-600">{row.department}</td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${row.accent}`}>
                                {row.access}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-700">
                                <span className={`h-2.5 w-2.5 rounded-full ${row.dot}`} />
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="glass-card rounded-[30px] p-5 md:p-6">
                    <div className="mb-5 flex items-center justify-between">
                      <h2 className="text-2xl font-extrabold tracking-[-0.04em] text-slate-800">Platform Growth</h2>
                      <span className="rounded-lg bg-[#f5d8eb] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#b10e6b]">
                        Last 30 Days
                      </span>
                    </div>

                    <div className="mt-3 flex h-28 items-end gap-2">
                      {[40, 55, 33, 68, 82, 58, 72, 90].map((value, index) => (
                        <div key={value + index} className="flex-1 rounded-t-2xl bg-[#dfe8ff]" style={{ height: `${value}%` }} />
                      ))}
                    </div>

                    <div className="mt-6 space-y-4">
                      <div>
                        <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          <span>New Users</span>
                          <span className="text-slate-700">+124%</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full w-[70%] rounded-full bg-[#2563eb]" />
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          <span>Event Registrations</span>
                          <span className="text-slate-700">+45%</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full w-[45%] rounded-full bg-[#7c3aed]" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-[30px] bg-[#20253a] p-5 text-white shadow-lg">
                    <div className="absolute right-4 top-4 text-white/10">
                      <span className="material-symbols-outlined text-6xl">info</span>
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">System Health</p>
                    <h4 className="mt-3 text-2xl font-extrabold tracking-[-0.04em]">All systems operational</h4>
                    <div className="mt-4 flex items-center gap-2 text-sm text-white/80">
                      <span className="h-2.5 w-2.5 animate-ping rounded-full bg-emerald-400" />
                      Real-time tracking enabled
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "events" && (
            <div className="glass-card rounded-[30px] p-8">
              <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-slate-800">Events</h1>
            </div>
          )}

          {activeTab === "attendance" && (
            <div className="glass-card rounded-[30px] p-8">
              <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-slate-800">Attendance</h1>
            </div>
          )}

          {activeTab === "certificates" && (
            <div className="glass-card rounded-[30px] p-8">
              <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-slate-800">Certificates</h1>
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="glass-card rounded-[30px] p-8">
              <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-slate-800">Analytics</h1>
            </div>
          )}
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/90 backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.key && !item.to;
            return (
              <button
                key={item.key}
                onClick={() => handleNavClick(item)}
                className={`flex flex-col items-center gap-1 px-2 py-2 text-[10px] font-bold ${isActive ? "text-[#b10e6b]" : "text-slate-500"}`}
              >
                <span className="material-symbols-outlined" style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default SuperAdminDashboard;
