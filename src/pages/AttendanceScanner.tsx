import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { Html5QrcodeScanner } from 'html5-qrcode';

import { db } from '@/lib/firebase';

interface ScannedTicket {
  eventId: string;
  studentId: string;
  ticketCode: string;
  eventTitle: string;
  scannedAt: string;
}

const AttendanceScanner = () => {
  const navigate = useNavigate();
  const [adminId, setAdminId] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [scannedTickets, setScannedTickets] = useState<ScannedTicket[]>([]);
  const [mode, setMode] = useState<'attendance' | 'food'>('attendance');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [foodRegistration, setFoodRegistration] = useState<any>(null);
  const [foodDocId, setFoodDocId] = useState('');

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // ---- OLD SCANNER LOGIC (ported from the previous version) ----
  // Just flips the flag; the actual scanner is created in the effect below,
  // once the #reader div has actually mounted into the DOM.
  const handleQRScan = () => {
    setScannerOpen(true);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
    setScannerOpen(false);
  };

  useEffect(() => {
    if (!scannerOpen) return;
    if (scannerRef.current) return;

    const readerElement = document.getElementById('reader');
    if (!readerElement) return;

    let cancelled = false;

    const startScanner = () => {
      if (cancelled || scannerRef.current) return;

      scannerRef.current = new Html5QrcodeScanner(
        'reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        false
      );

      scannerRef.current.render(
        async (decodedText) => {
          try {
            const qrData = JSON.parse(decodedText);
            const ticketCode = qrData.ticketCode || decodedText;

            if (mode === 'attendance') {
              await verifyTicket(ticketCode);
            } else {
              await verifyFood(ticketCode);
            }

            stopScanner();
          } catch {
            toast.error('Invalid QR Code');
          }
        },
        () => {}
      );
    };

    const rafId = window.requestAnimationFrame(startScanner);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      scannerRef.current?.clear().catch(() => {});
      scannerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerOpen, mode]);
  // ---- END OLD SCANNER LOGIC ----

  const totalCapacity = 1500;
  const remainingCapacity = Math.max(totalCapacity - scannedTickets.length, 0);

  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem('isAdminLoggedIn');
    const storedAdminId = sessionStorage.getItem('adminId');

    if (!isLoggedIn || !storedAdminId) {
      navigate('/admin-login');
      return;
    }

    setAdminId(storedAdminId);

    const stored = localStorage.getItem('scanned_tickets');
    if (stored) {
      setScannedTickets(JSON.parse(stored));
    }
  }, [navigate]);

  useEffect(() => {
    const fontLinks = [
      'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,600;0,700;0,800;1,400&display=swap',
      'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap',
    ];

    const style = document.createElement('style');
    style.innerHTML = `
      body {
        background-color: #f9f9ff;
        font-family: 'Plus Jakarta Sans', sans-serif;
        margin: 0;
        padding: 0;
        overflow-x: hidden;
      }
      .material-symbols-outlined {
        font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        display: inline-block;
        vertical-align: middle;
        font-family: 'Material Symbols Outlined';
      }
      .glass-card {
        background: rgba(255,255,255,0.7);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255,255,255,0.4);
        box-shadow: 0 8px 32px 0 rgba(31,38,135,0.07);
      }
      .brand-gradient-bg {
        background: linear-gradient(135deg, #b10e6b 0%, #4648d4 100%);
      }
      .brand-gradient-text {
        background: linear-gradient(135deg, #b10e6b 0%, #4648d4 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .qr-scanner-frame {
        position: relative;
        overflow: hidden;
      }
      .scanner-line {
        width: 100%;
        height: 2px;
        background: linear-gradient(to right, transparent, #b10e6b, transparent);
        position: absolute;
        top: 0;
        left: 0;
        animation: scan 2.5s infinite linear;
      }
      @keyframes scan {
        0% { top: 0; }
        100% { top: 100%; }
      }
      .pulse-active {
        animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
      @keyframes pulse-ring {
        0% { transform: scale(0.95); opacity: 1; }
        100% { transform: scale(1.05); opacity: 0; }
      }
      .custom-scrollbar::-webkit-scrollbar { width: 6px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: #debec8; border-radius: 10px; }
      .bg-surface { background-color: #f9f9ff; }
      .bg-surface-container { background-color: #e7eeff; }
      .bg-surface-container-low { background-color: #f0f3ff; }
      .bg-surface-container-highest { background-color: #d8e3fb; }
      .bg-primary-container { background-color: #d23284; }
      .bg-secondary-fixed { background-color: #e1e0ff; }
      .bg-secondary-fixed-dim { background-color: #c0c1ff; }
      .bg-primary-fixed { background-color: #ffd9e4; }
      .bg-error-container { background-color: #ffdad6; }
      .text-on-surface { color: #111c2d; }
      .text-on-surface-variant { color: #574048; }
      .text-on-primary-container { color: #fffbff; }
      .text-primary { color: #b10e6b; }
      .text-secondary { color: #4648d4; }
      .text-error { color: #ba1a1a; }
      .border-outline-variant { border-color: #debec8; }
      .font-headline-lg { font-size: 32px; line-height: 1.2; letter-spacing: -0.02em; font-weight: 800; font-family: 'Plus Jakarta Sans'; }
      .font-headline-md { font-size: 24px; line-height: 1.3; font-weight: 700; font-family: 'Plus Jakarta Sans'; }
      .font-body-md { font-size: 16px; line-height: 1.5; font-weight: 400; font-family: 'Plus Jakarta Sans'; }
      .font-label-md {
        font-size: 14px;
        line-height: 1.2;
        letter-spacing: 0.05em;
        font-weight: 600;
        font-family: 'Plus Jakarta Sans';
      }
      .text-headline-lg { font-size: 32px; line-height: 1.2; letter-spacing: -0.02em; font-weight: 800; }
      .text-headline-md { font-size: 24px; line-height: 1.3; font-weight: 700; }
      .text-body-md { font-size: 16px; line-height: 1.5; font-weight: 400; }
      .text-label-md { font-size: 14px; line-height: 1.2; letter-spacing: 0.05em; font-weight: 600; }
      .tracking-tight { letter-spacing: -0.02em; }
      .shadow-sm { box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06); }
    `;

    fontLinks.forEach((href) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    });
    document.head.appendChild(style);

    return () => {
      document.head.querySelectorAll('link[href*="fonts.googleapis.com"]').forEach((node) => node.remove());
      style.remove();
    };
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('isAdminLoggedIn');
    sessionStorage.removeItem('adminId');
    toast.success('Logged out successfully');
    navigate('/admin-login');
  };

  const verifyFood = async (ticketCode: string) => {
    try {
      const q = query(
        collection(db, 'eventRegistrations'),
        where('ticketCode', '==', ticketCode),
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error('Invalid ticket code');
        return;
      }

      const registrationDoc = querySnapshot.docs[0];
      setFoodDocId(registrationDoc.id);
      setFoodRegistration(registrationDoc.data());
      toast.success('Registration Found');
    } catch (error) {
      console.error(error);
      toast.error('Food lookup failed');
    }
  };

  const verifyTicket = async (ticketCode: string) => {
    try {
      const q = query(
        collection(db, 'eventRegistrations'),
        where('ticketCode', '==', ticketCode),
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error('Invalid ticket code', {
          description: 'Ticket not found',
        });
        return;
      }

      const registrationDoc = querySnapshot.docs[0];
      const registration = registrationDoc.data();

      if (registration.attendance === true) {
        toast.error('Already checked in!', {
          description: 'This ticket has already been used',
        });
        return;
      }

      await updateDoc(doc(db, 'eventRegistrations', registrationDoc.id), {
        attendance: true,
      });

      const scannedTicket: ScannedTicket = {
        eventId: registration.eventId,
        studentId: registration.studentId,
        ticketCode: registration.ticketCode,
        eventTitle: registration.eventTitle,
        scannedAt: new Date().toISOString(),
      };

      setScannedTickets((prev) => {
        const updated = [...prev, scannedTicket];
        localStorage.setItem('scanned_tickets', JSON.stringify(updated));
        return updated;
      });

      toast.success('Check-in successful!', {
        description: `${registration.eventTitle} - ${registration.studentId}`,
      });

      setManualCode('');
    } catch (error) {
      console.error(error);
      toast.error('Verification failed');
    }
  };

  const handleManualVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!manualCode.trim()) {
      toast.error('Please enter a ticket code');
      return;
    }

    if (mode === 'attendance') {
      await verifyTicket(manualCode.trim());
    } else {
      await verifyFood(manualCode.trim());
    }
  };

  const collectFood = async (memberIndex: number) => {
    try {
      if (!foodRegistration || !foodDocId) return;

      const updatedMembers = [...foodRegistration.members];
      updatedMembers[memberIndex].foodCollected = true;

      await updateDoc(doc(db, 'eventRegistrations', foodDocId), {
        members: updatedMembers,
      });

      setFoodRegistration({
        ...foodRegistration,
        members: updatedMembers,
      });

      toast.success('Food Collected Successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update food status');
    }
  };

  const recentActivity = [...scannedTickets].reverse().slice(0, 4);

  return (
    <div className="text-on-surface">
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 h-16 bg-surface/80 backdrop-blur-md shadow-sm md:hidden">
        <span className="text-headline-md font-headline-md font-extrabold text-primary">AdminCheck</span>
        <div className="flex gap-4">
          <button className="material-symbols-outlined text-primary" aria-label="notifications">notifications</button>
          <button className="material-symbols-outlined text-primary" aria-label="settings">settings</button>
        </div>
      </header>

      <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 py-6 px-4 z-40 bg-surface-container-low border-r border-outline-variant transition-all duration-200 ease-in-out shadow-md">
        <div className="mb-10 px-2">
          <h1 className="font-headline-md text-headline-md text-primary font-extrabold">AdminCheck</h1>
          <p className="font-label-md text-label-md text-on-surface-variant opacity-70">Event Terminal v2.4</p>
        </div>

        <nav className="flex-1 space-y-2">
          <button className="flex w-full items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-on-surface hover:bg-[rgba(192,193,255,0.2)] transition-all rounded-xl">
            <span className="material-symbols-outlined" data-icon="dashboard">dashboard</span>
            <span className="font-label-md text-label-md">Dashboard</span>
          </button>
          <button className="flex w-full items-center gap-3 px-4 py-3 bg-primary-container text-on-primary-container rounded-xl font-bold shadow-sm transition-all">
            <span className="material-symbols-outlined" data-icon="qr_code_scanner">qr_code_scanner</span>
            <span className="font-label-md text-label-md">Scanner</span>
          </button>
          <button className="flex w-full items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-on-surface hover:bg-[rgba(192,193,255,0.2)] transition-all rounded-xl">
            <span className="material-symbols-outlined" data-icon="podcasts">podcasts</span>
            <span className="font-label-md text-label-md">Live Feed</span>
          </button>
          <button
            className="flex w-full items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-on-surface hover:bg-[rgba(192,193,255,0.2)] transition-all rounded-xl"
            onClick={() => navigate('/event-management')}
          >
            <span className="material-symbols-outlined" data-icon="event_available">event_available</span>
            <span className="font-label-md text-label-md">Event Management</span>
          </button>
          <button className="flex w-full items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-on-surface hover:bg-[rgba(192,193,255,0.2)] transition-all rounded-xl">
            <span className="material-symbols-outlined" data-icon="analytics">analytics</span>
            <span className="font-label-md text-label-md">Reports</span>
          </button>
        </nav>

        <div className="mt-auto pt-6 space-y-2 border-t border-outline-variant/30">
          <button className="w-full flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-on-surface rounded-xl">
            <span className="material-symbols-outlined" data-icon="help">help</span>
            <span className="font-label-md text-label-md">Help</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-error hover:bg-[rgba(186,26,26,0.08)] rounded-xl" onClick={handleLogout}>
            <span className="material-symbols-outlined" data-icon="logout">logout</span>
            <span className="font-label-md text-label-md">Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="min-h-screen pt-20 md:pt-8 md:pl-72 pb-24 px-4 md:px-8 transition-all">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Scanner Hub</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">Real-time student validation &amp; resource tracking</p>
            </div>

            <div className="p-1 bg-surface-container rounded-xl flex items-center gap-1 glass-card border-none">
              <button
                className={`px-6 py-2 rounded-lg font-label-md text-label-md transition-all ${
                  mode === 'attendance' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-[rgba(216,227,251,0.4)]'
                }`}
                onClick={() => setMode('attendance')}
              >
                Attendance
              </button>
              <button
                className={`px-6 py-2 rounded-lg font-label-md text-label-md transition-all ${
                  mode === 'food' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-[rgba(216,227,251,0.4)]'
                }`}
                onClick={() => setMode('food')}
              >
                Food Distribution
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
            <section className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4 md:gap-6">
              <div className="glass-card rounded-[2rem] p-6 md:p-8 relative overflow-hidden group">
                <div className="absolute -right-24 -top-24 w-64 h-64 brand-gradient-bg opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity" />
                <div className="mb-8 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg brand-gradient-bg flex items-center justify-center text-white">
                      <span className="material-symbols-outlined" data-icon="qr_code_scanner">qr_code_scanner</span>
                    </div>
                    <h3 className="font-headline-md text-headline-md">Live Scanner</h3>
                  </div>

                  <button
                    type="button"
                    className="rounded-full bg-surface-container px-4 py-2 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container-highest"
                    onClick={() => {
                      if (scannerOpen) {
                        stopScanner();
                      } else {
                        handleQRScan();
                      }
                    }}
                  >
                    {scannerOpen ? 'Stop Scanner' : 'Start Scanner'}
                  </button>
                </div>

                {scannerOpen ? (
                  <div className="aspect-video relative rounded-3xl overflow-hidden bg-black border-4 border-surface-container-highest shadow-inner group/scan">
                    <div className="absolute inset-0 w-full h-full bg-slate-900 opacity-80" />

                    <div
                      id="reader"
                      className="absolute inset-0 z-20"
                    />

                    <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 transition-opacity duration-300 pointer-events-none" id="success-overlay">
                      <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg transform scale-90 active:scale-100 transition-transform">
                        <span className="material-symbols-outlined text-primary text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      </div>
                      <span className="mt-4 font-headline-md text-white drop-shadow-md">Verified Successfully</span>
                    </div>

                    <button
                      type="button"
                      className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-md text-white rounded-full font-label-md text-label-md border border-white/30 hover:bg-white/30 transition-all z-30"
                      onClick={stopScanner}
                    >
                      <span className="material-symbols-outlined">flash_on</span>
                      Stop Scanner
                    </button>
                  </div>
                ) : (
                  <div className="aspect-video relative rounded-3xl overflow-hidden bg-surface-container-low border-2 border-dashed border-outline-variant/60 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3 text-center px-6">
                      <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center text-on-surface-variant">
                        <span className="material-symbols-outlined text-3xl">qr_code_scanner</span>
                      </div>
                      <p className="font-label-md text-label-md text-on-surface-variant">
                        Scanner is off — tap "Start Scanner" to begin scanning tickets
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-8 pt-8 border-t border-outline-variant/30">
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-3 px-1">Manual Ticket Verification</label>
                  <form onSubmit={handleManualVerify} className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">keyboard</span>
                      <input
                        className="w-full pl-12 pr-4 py-4 rounded-xl bg-surface border border-outline-variant/50 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-body-md outline-none"
                        placeholder="Enter ticket ID (e.g., ADM-2024-X1)"
                        type="text"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-8 py-4 brand-gradient-bg text-white font-button text-button rounded-xl shadow-lg hover:shadow-primary/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      Verify
                      <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                    </button>
                  </form>
                </div>
              </div>
            </section>

            <aside className="lg:col-span-5 xl:col-span-4 space-y-4 md:space-y-6">
              <div className="grid grid-cols-2 gap-4 md:gap-6">
                <div className="glass-card p-6 rounded-[1.5rem] flex flex-col justify-between h-36">
                  <div className="flex justify-between items-start">
                    <span className="material-symbols-outlined text-primary p-2 bg-primary-fixed rounded-lg">groups</span>
                    <span className="text-green-600 font-label-md text-[12px] bg-green-50 px-2 py-0.5 rounded-full">+12%</span>
                  </div>
                  <div>
                    <p className="font-label-md text-label-md text-on-surface-variant">Check-ins Today</p>
                    <p className="font-headline-md text-headline-md text-on-surface">{scannedTickets.length}</p>
                  </div>
                </div>

                <div className="glass-card p-6 rounded-[1.5rem] flex flex-col justify-between h-36">
                  <div className="flex justify-between items-start">
                    <span className="material-symbols-outlined text-secondary p-2 bg-secondary-fixed rounded-lg">event_seat</span>
                    <span className="text-on-surface-variant font-label-md text-[12px]">Total {totalCapacity}</span>
                  </div>
                  <div>
                    <p className="font-label-md text-label-md text-on-surface-variant">Remaining Capacity</p>
                    <p className="font-headline-md text-headline-md text-on-surface">{remainingCapacity}</p>
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-[2rem] p-6 flex flex-col h-[500px]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-headline-md text-headline-md">Recent Activity</h3>
                  <button className="text-primary font-label-md text-label-md hover:underline">View All</button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                  {recentActivity.length === 0 ? (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-outline-variant/50 text-sm text-on-surface-variant">
                      No recent activity yet.
                    </div>
                  ) : (
                    recentActivity.map((ticket, index) => (
                      <div key={`${ticket.ticketCode}-${index}`} className="flex items-center gap-4 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 hover:bg-white transition-colors group">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0 bg-primary/10 flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined">person</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-label-md text-label-md text-on-surface line-clamp-1">{ticket.studentId}</p>
                          <p className="text-[12px] text-on-surface-variant opacity-70">{ticket.eventTitle}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-label-md text-[12px] text-on-surface">{new Date(ticket.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {mode === 'food' && foodRegistration && (
                <div className="glass-card rounded-[2rem] p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="font-headline-md text-headline-md">Food Distribution</h4>
                    <span className="text-primary font-label-md text-label-md">{foodRegistration.teamName || 'Solo Participant'}</span>
                  </div>

                  <div className="space-y-3">
                    {foodRegistration.members?.map((member: any, index: number) => (
                      <div key={`${member.studentId || index}-${index}`} className="flex justify-between items-center border border-outline-variant/30 p-3 rounded-xl bg-surface-container-low">
                        <div>
                          <p className="font-medium text-on-surface">{member.name}</p>
                          <p className="text-sm text-on-surface-variant">{member.studentId}</p>
                        </div>

                        {member.foodCollected ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-tight text-green-700">Collected</span>
                        ) : (
                          <button type="button" className="px-3 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium" onClick={() => collectFood(index)}>
                            Collect Food
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 pb-safe h-20 bg-surface/90 backdrop-blur-lg shadow-[0_-4px_12px_rgba(0,0,0,0.05)] rounded-t-xl">
        <button className="flex flex-col items-center justify-center bg-primary-container text-on-primary-container rounded-full px-5 py-1">
          <span className="material-symbols-outlined" data-icon="qr_code_2">qr_code_2</span>
          <span className="font-label-md text-label-md">Scanner</span>
        </button>
        <button className="flex flex-col items-center justify-center text-on-surface-variant">
          <span className="material-symbols-outlined" data-icon="history">history</span>
          <span className="font-label-md text-label-md">Activity</span>
        </button>
        <button className="flex flex-col items-center justify-center text-on-surface-variant">
          <span className="material-symbols-outlined" data-icon="keyboard">keyboard</span>
          <span className="font-label-md text-label-md">Manual</span>
        </button>
        <button className="flex flex-col items-center justify-center text-on-surface-variant">
          <span className="material-symbols-outlined" data-icon="settings">settings</span>
          <span className="font-label-md text-label-md">Settings</span>
        </button>
      </nav>
    </div>
  );
};

export default AttendanceScanner;
