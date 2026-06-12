import {
  Calendar,
  Users,
  QrCode,
  Award,
  Shield,
  LayoutDashboard,
} from "lucide-react";

const Features = () => {
  const features = [
  {
    icon: Calendar,
    title: "Event Registration",
    desc: "Students can discover and register for events instantly.",
  },
  {
    icon: Users,
    title: "Team Management",
    desc: "Create teams and manage group competitions effortlessly.",
  },
  {
    icon: QrCode,
    title: "QR Tickets",
    desc: "Instant ticket generation with unique QR verification.",
  },
  {
    icon: Shield,
    title: "Attendance Tracking",
    desc: "Scan QR codes and mark attendance in real time.",
  },
  {
    icon: Award,
    title: "Certificates",
    desc: "Automatically generate participation certificates.",
  },
  {
    icon: LayoutDashboard,
    title: "Organizer Dashboard",
    desc: "Manage events, participants, admins and analytics.",
  },
  ];

  return (
    <section
  id="features"
  className="py-24 bg-gradient-to-b from-purple-50 via-white to-pink-50"
>
      <div className="max-w-7xl mx-auto px-6">

        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-extrabold">

  <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
    Powerful Features
  </span>

</h2>

          <p className="mt-5 text-xl text-gray-500">
            Built for college festivals, hackathons, competitions,
workshops and large-scale campus events.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition duration-300"
            >
              <feature.icon
                size={40}
                className="text-indigo-600 mb-5"
              />

              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {feature.title}
              </h3>

              <p className="text-gray-600 leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Features;