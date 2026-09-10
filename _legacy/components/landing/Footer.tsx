import { Github, Linkedin, Mail, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer id="footer" className="bg-[#f0f3ff] border-t border-[#debec8]/40 pt-20 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3">
              <img src="/logo-re.png" alt="FestFlow" className="h-14" />
              <div>
                <h2 className="text-3xl font-black bg-gradient-to-r from-[#b10e6b] to-[#4b41e1] bg-clip-text text-transparent">
                  FestFlow
                </h2>
                <p className="text-sm text-[#574048]">Campus Event OS</p>
              </div>
            </div>

            <p className="mt-6 text-[#574048] leading-7">
              FestFlow is a complete campus event management platform that
              simplifies registrations, QR ticketing, attendance, food
              distribution, certificates, and organizer workflows.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-lg font-bold mb-5 text-[#111c2d]">Product</h3>
            <ul className="space-y-3 text-[#574048]">
              <li>Event Registration</li>
              <li>QR Attendance</li>
              <li>Food Distribution</li>
              <li>Certificates</li>
              <li>Organizer Dashboard</li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-lg font-bold mb-5 text-[#111c2d]">Company</h3>
            <ul className="space-y-3 text-[#574048]">
              <li>About FestFlow</li>
              <li>Features</li>
              <li>How it Works</li>
              <li>Contact</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-bold mb-5 text-[#111c2d]">Connect</h3>
            <div className="space-y-4 text-[#574048]">
              <div className="flex items-center gap-3">
                <Mail size={18} />
                <span>contact@festflow.in</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin size={18} />
                <span>India</span>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button className="h-11 w-11 rounded-xl bg-[#111c2d]/5 hover:bg-[#111c2d]/10 transition flex items-center justify-center text-[#111c2d]">
                <Github size={20} />
              </button>
              <button className="h-11 w-11 rounded-xl bg-[#111c2d]/5 hover:bg-[#111c2d]/10 transition flex items-center justify-center text-[#111c2d]">
                <Linkedin size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-[#debec8]/40 mt-16 pt-8 flex flex-col md:flex-row items-center justify-between">
          <p className="text-[#574048] text-sm">
            © 2026 FestFlow. All rights reserved.
          </p>
          <p className="text-[#574048] text-sm mt-3 md:mt-0">
            Built for Colleges • Clubs • Student Communities
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;