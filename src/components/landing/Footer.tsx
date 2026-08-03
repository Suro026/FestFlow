import {
  Github,
  Linkedin,
  Mail,
  MapPin,
} from "lucide-react";

const Footer = () => {
  return (
    <footer
      id="footer"
      className="bg-slate-950 text-white pt-20 pb-8"
    >
      <div className="max-w-7xl mx-auto px-6">

        <div className="grid lg:grid-cols-4 gap-12">

          {/* Brand */}

          <div>

            <div className="flex items-center gap-3">

              <img
                src="/logo-re.png"
                alt="FestFlow"
                className="h-16"
              />

              <div>

                <h2 className="text-3xl font-black bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
                  FestFlow
                </h2>

                <p className="text-sm text-gray-400">
                  Campus Event OS
                </p>

              </div>

            </div>

            <p className="mt-6 text-gray-400 leading-7">
              FestFlow is a complete campus event management
              platform that simplifies registrations,
              QR ticketing,
              attendance,
              food distribution,
              certificates,
              and organizer workflows.
            </p>

          </div>

          {/* Product */}

          <div>

            <h3 className="text-lg font-bold mb-5">
              Product
            </h3>

            <ul className="space-y-3 text-gray-400">

              <li>Event Registration</li>

              <li>QR Attendance</li>

              <li>Food Distribution</li>

              <li>Certificates</li>

              <li>Organizer Dashboard</li>

            </ul>

          </div>

          {/* Company */}

          <div>

            <h3 className="text-lg font-bold mb-5">
              Company
            </h3>

            <ul className="space-y-3 text-gray-400">

              <li>About FestFlow</li>

              <li>Features</li>

              <li>How it Works</li>

              <li>Contact</li>

            </ul>

          </div>

          {/* Contact */}

          <div>

            <h3 className="text-lg font-bold mb-5">
              Connect
            </h3>

            <div className="space-y-4 text-gray-400">

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

              <button className="h-11 w-11 rounded-xl bg-white/10 hover:bg-white/20 transition flex items-center justify-center">

                <Github size={20} />

              </button>

              <button className="h-11 w-11 rounded-xl bg-white/10 hover:bg-white/20 transition flex items-center justify-center">

                <Linkedin size={20} />

              </button>

            </div>

          </div>

        </div>

        <div className="border-t border-slate-800 mt-16 pt-8 flex flex-col md:flex-row items-center justify-between">

          <p className="text-gray-500 text-sm">
            © 2026 FestFlow. All rights reserved.
          </p>

          <p className="text-gray-500 text-sm mt-3 md:mt-0">
            Built for Colleges • Clubs • Student Communities
          </p>

        </div>

      </div>
    </footer>
  );
};

export default Footer;