const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white py-20">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <div className="flex justify-center mb-6">
  <img
    src="/logo-re.png"
    alt="FestFlow"
    className="h-24 w-auto"
  />
</div>

        <h2 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
  FestFlow
</h2>
<p className="text-lg text-purple-200 mb-4">
  Celebrate • Connect • Experience
</p>

        <p className="text-gray-400 max-w-2xl mx-auto">
          India's Smart Fest & Event Management Platform.

Manage registrations, QR attendance,
food distribution, certificates,
team events and complete fest operations
from a single platform.
        </p>

        <div className="border-t border-gray-800 mt-10 pt-8">
          <p className="text-gray-500">
            © 2026 FestFlow • Built for Colleges, Clubs & Communities
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-6 mt-10">

  <div className="bg-white/10 px-5 py-3 rounded-xl">
    🎉 Multi-Fest Support
  </div>

  <div className="bg-white/10 px-5 py-3 rounded-xl">
    🎟 QR Tickets
  </div>

  <div className="bg-white/10 px-5 py-3 rounded-xl">
    🏆 Certificates
  </div>

  <div className="bg-white/10 px-5 py-3 rounded-xl">
    📊 Analytics
  </div>

</div>

      </div>
    </footer>
  );
};

export default Footer;