import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Admin {
  id: string;
  fullName?: string;
  email?: string;
  designation?: string;
  department?: string;
  status?: string;
  avatarUrl?: string;
  [key: string]: any;
}

const DEPARTMENT_STYLES: Record<string, { badge: string; text: string }> = {
  COORDINATION: { badge: "bg-primary-fixed", text: "text-on-primary-fixed-variant" },
  LOGISTICS: { badge: "bg-secondary-fixed", text: "text-on-secondary-fixed-variant" },
  MARKETING: { badge: "bg-tertiary-fixed", text: "text-on-tertiary-fixed-variant" },
};

const DEFAULT_DEPT_STYLE = { badge: "bg-surface-container-high", text: "text-on-surface-variant" };

const PAGE_SIZE = 8;

const ManageAdmins = () => {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, "organizers"));

      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Admin[];

      setAdmins(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load administrators");
    } finally {
      setLoading(false);
    }
  };

  const deleteAdmin = async (id: string, name?: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${name || "this admin"}? This action cannot be undone.`
    );

    if (!confirmed) return;

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

  const filteredAdmins = admins.filter((admin) => {
    const term = searchTerm.toLowerCase();
    return (
      admin.fullName?.toLowerCase().includes(term) ||
      admin.email?.toLowerCase().includes(term) ||
      admin.designation?.toLowerCase().includes(term) ||
      admin.department?.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredAdmins.length / PAGE_SIZE));
  const paginatedAdmins = filteredAdmins.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const activeCount = admins.filter(
    (a) => (a.status || "").toLowerCase() === "online"
  ).length;

  const departmentCounts = admins.reduce<Record<string, number>>((acc, a) => {
    const dept = (a.department || "UNASSIGNED").toUpperCase();
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});

  const departmentBars = Object.entries(departmentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([dept, count]) => ({
      dept,
      percent: admins.length ? Math.round((count / admins.length) * 100) : 0,
    }));

  const barColors = ["bg-primary", "bg-secondary", "bg-tertiary"];
  const barTextColors = ["text-primary", "text-secondary", "text-tertiary"];

  const navItems = [
    { label: "Dashboard", icon: "dashboard", to: "/super-admin-dashboard" },
    { label: "Admins", icon: "admin_panel_settings", to: "/manage-admins", active: true },
    { label: "Events", icon: "event", to: "/events" },
    { label: "Attendance", icon: "how_to_reg", to: "/attendance" },
    { label: "Certificates", icon: "card_membership", to: "/certificates" },
    { label: "Analytics", icon: "analytics", to: "/analytics" },
  ];

  return (
    <div className="bg-surface text-on-surface font-body-md overflow-x-hidden min-h-screen">
      <style>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .vibrant-gradient {
          background: linear-gradient(135deg, #b10e6b 0%, #4648d4 100%);
        }
        .vibrant-text-gradient {
          background: linear-gradient(135deg, #b10e6b 0%, #4648d4 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .manage-admins-scope ::-webkit-scrollbar {
          width: 6px;
        }
        .manage-admins-scope ::-webkit-scrollbar-track {
          background: transparent;
        }
        .manage-admins-scope ::-webkit-scrollbar-thumb {
          background: #debec8;
          border-radius: 10px;
        }
        .manage-admins-scope ::-webkit-scrollbar-thumb:hover {
          background: #b10e6b;
        }
      `}</style>

      <div className="manage-admins-scope">
        {/* Sidebar */}
        <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container-lowest shadow-sm flex flex-col p-4 gap-4 z-20">
          <div className="mb-8 px-2">
            <h1 className="font-headline-md text-headline-md font-extrabold text-primary">
              FestFlow
            </h1>
            <p className="text-xs font-semibold text-on-surface-variant tracking-wider uppercase">
              Super Admin Portal
            </p>
          </div>
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.to)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors group ${
                  item.active
                    ? "text-primary font-bold bg-primary-fixed"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span
                  className="material-symbols-outlined group-hover:text-primary"
                  style={item.active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                <span className="font-label-md text-label-md">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="mt-auto">
            <button
              onClick={() => navigate("/create-event")}
              className="w-full vibrant-gradient text-white py-4 rounded-2xl font-button shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined">add_circle</span>
              Create Event
            </button>
          </div>
        </aside>

        {/* Top Navigation */}
        <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-16 bg-surface/80 backdrop-blur-md px-8 flex justify-between items-center z-10">
          <div className="flex items-center flex-1 max-w-xl">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                search
              </span>
              <input
                className="w-full bg-surface-container border-none rounded-full py-2 pl-11 pr-4 focus:ring-2 focus:ring-primary/20 text-body-md transition-all"
                placeholder="Search administrators, roles, or actions..."
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-surface"></span>
              </button>
              <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined">settings</span>
              </button>
            </div>
            <div className="flex items-center gap-3 pl-6 border-l border-outline-variant">
              <div className="text-right">
                <p className="font-label-md text-label-md text-on-surface">Admin Root</p>
                <p className="text-[10px] text-primary font-bold uppercase tracking-widest">
                  Master Access
                </p>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-primary-fixed overflow-hidden">
                <img
                  className="w-full h-full object-cover"
                  alt="Super admin avatar"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBaWQp3haOwB2_7qC3yjPAY8VI7wRo8KJ0yzO0xAnBUhjSxqx5Tqa0AR903srrrrCCgYDFEm7wrafrNyi6hqnd1QgU7hdQAsyPAVTbllKw34BgTvGpAFzRSk3vTo1KXOwLACjtV18Iz_cITJyibIIpcdu0wp6EGGOe6c3xzXx1q6HzgwDzfCmLJWd-nlh55rt5qhHwhCeiotwOgwjBmmhthPWYAIRIB7ANtv-lCQjze_rDrJiFWqEcF"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="ml-64 pt-24 pb-12 px-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Page Header */}
            <div className="flex items-end justify-between">
              <div className="space-y-1">
                <h2 className="font-headline-lg text-headline-lg text-on-surface">
                  Manage Admins
                </h2>
                <p className="text-on-surface-variant font-body-md">
                  Configure access levels and supervise administrator activity.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button className="px-6 py-3 rounded-xl border-2 border-primary text-primary font-button hover:bg-primary/5 transition-colors">
                  Export Directory
                </button>
                <button
                  onClick={() => navigate("/create-admin")}
                  className="px-6 py-3 rounded-xl vibrant-gradient text-white font-button shadow-xl shadow-primary/20 flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined">person_add</span>
                  Add Admin
                </button>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-surface-container-lowest p-6 rounded-[2rem] shadow-sm border border-outline-variant/30 relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined">group</span>
                  </div>
                  <p className="text-on-surface-variant font-label-md">Total Admins</p>
                  <h3 className="text-4xl font-extrabold text-on-surface mt-1">
                    {admins.length}
                  </h3>
                </div>
                <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:opacity-10 transition-opacity">
                  <span className="material-symbols-outlined text-9xl">group</span>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-6 rounded-[2rem] shadow-sm border border-outline-variant/30 relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-secondary-fixed text-secondary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined">bolt</span>
                  </div>
                  <p className="text-on-surface-variant font-label-md">Active Now</p>
                  <h3 className="text-4xl font-extrabold text-on-surface mt-1">
                    {activeCount}
                  </h3>
                  <p className="text-sm text-on-surface-variant font-medium mt-2">
                    Currently managing events
                  </p>
                </div>
                <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:opacity-10 transition-opacity">
                  <span className="material-symbols-outlined text-9xl">bolt</span>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-6 rounded-[2rem] shadow-sm border border-outline-variant/30">
                <p className="text-on-surface-variant font-label-md mb-4">
                  Department Distribution
                </p>
                <div className="space-y-3">
                  {departmentBars.length === 0 && (
                    <p className="text-sm text-on-surface-variant">No data yet</p>
                  )}
                  {departmentBars.map((bar, i) => (
                    <div key={bar.dept}>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span>{bar.dept}</span>
                        <span className={barTextColors[i]}>{bar.percent}%</span>
                      </div>
                      <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                        <div
                          className={`h-full ${barColors[i]}`}
                          style={{ width: `${bar.percent}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Admin Directory */}
            <div className="bg-surface-container-lowest rounded-[2.5rem] shadow-sm border border-outline-variant/30 overflow-hidden">
              <div className="px-8 py-6 border-b border-outline-variant/20 flex justify-between items-center bg-surface-bright/50">
                <h3 className="font-headline-md text-on-surface">
                  Administrator Directory
                </h3>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-surface-container-high rounded-lg transition-colors">
                    <span className="material-symbols-outlined">filter_list</span>
                  </button>
                  <button className="p-2 hover:bg-surface-container-high rounded-lg transition-colors">
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container/30">
                      <th className="px-8 py-5 font-label-md text-on-surface-variant uppercase text-xs tracking-widest">
                        Administrator
                      </th>
                      <th className="px-8 py-5 font-label-md text-on-surface-variant uppercase text-xs tracking-widest">
                        Department & Role
                      </th>
                      <th className="px-8 py-5 font-label-md text-on-surface-variant uppercase text-xs tracking-widest">
                        Status
                      </th>
                      <th className="px-8 py-5 font-label-md text-on-surface-variant uppercase text-xs tracking-widest text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {loading && (
                      <tr>
                        <td className="px-8 py-6 text-on-surface-variant" colSpan={4}>
                          Loading administrators...
                        </td>
                      </tr>
                    )}

                    {!loading && paginatedAdmins.length === 0 && (
                      <tr>
                        <td className="px-8 py-6 text-on-surface-variant" colSpan={4}>
                          No administrators found.
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      paginatedAdmins.map((admin) => {
                        const dept = (admin.department || "UNASSIGNED").toUpperCase();
                        const deptStyle = DEPARTMENT_STYLES[dept] || DEFAULT_DEPT_STYLE;
                        const isOnline = (admin.status || "").toLowerCase() === "online";

                        return (
                          <tr
                            key={admin.id}
                            className="hover:bg-surface-container-low transition-colors group"
                          >
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl overflow-hidden ring-2 ring-primary-fixed bg-surface-container-high flex items-center justify-center">
                                  {admin.avatarUrl ? (
                                    <img
                                      className="w-full h-full object-cover"
                                      alt={admin.fullName || "Admin avatar"}
                                      src={admin.avatarUrl}
                                    />
                                  ) : (
                                    <span className="material-symbols-outlined text-on-surface-variant">
                                      person
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <p className="font-bold text-on-surface">
                                    {admin.fullName || "Unnamed Admin"}
                                  </p>
                                  <p className="text-sm text-on-surface-variant">
                                    {admin.email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <span
                                className={`inline-block px-3 py-1 rounded-lg text-xs font-bold mb-1 ${deptStyle.badge} ${deptStyle.text}`}
                              >
                                {dept}
                              </span>
                              <p className="text-sm font-medium text-on-surface">
                                {admin.designation || "—"}
                              </p>
                            </td>
                            <td className="px-8 py-6">
                              <div
                                className={`flex items-center gap-2 font-bold text-sm ${
                                  isOnline ? "text-green-600" : "text-on-surface-variant"
                                }`}
                              >
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    isOnline
                                      ? "bg-green-500 animate-pulse"
                                      : "bg-on-surface-variant/30"
                                  }`}
                                ></span>
                                {isOnline ? "Online" : "Offline"}
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary-fixed rounded-lg transition-all"
                                  title="View Activity"
                                >
                                  <span className="material-symbols-outlined">history</span>
                                </button>
                                <button
                                  className="p-2 text-on-surface-variant hover:text-secondary hover:bg-secondary-fixed rounded-lg transition-all"
                                  title="Edit Permissions"
                                  onClick={() => navigate(`/edit-admin/${admin.id}`)}
                                >
                                  <span className="material-symbols-outlined">lock_open</span>
                                </button>
                                <button
                                  className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container rounded-lg transition-all"
                                  title="Delete Admin"
                                  onClick={() => deleteAdmin(admin.id, admin.fullName)}
                                >
                                  <span className="material-symbols-outlined">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              <div className="px-8 py-6 border-t border-outline-variant/10 flex items-center justify-between">
                <p className="text-sm text-on-surface-variant">
                  Showing {paginatedAdmins.length} of {filteredAdmins.length} administrators
                </p>
                <div className="flex gap-2">
                  <button
                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-30"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant font-bold transition-colors ${
                        p === page
                          ? "bg-primary-fixed text-primary"
                          : "hover:bg-surface-container"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-30"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Warning Callout */}
            <div className="bg-error-container/20 border-l-4 border-error p-6 rounded-r-2xl flex items-start gap-4">
              <span
                className="material-symbols-outlined text-error"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                warning
              </span>
              <div>
                <h5 className="font-bold text-error">Administrative Security Policy</h5>
                <p className="text-on-surface-variant text-sm mt-1">
                  Deleting an administrator is a permanent action. All associated event
                  logs and historical data linked to this account will be archived and
                  access revoked immediately. Use the 'Edit Permissions' feature for
                  temporary suspension instead.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ManageAdmins;