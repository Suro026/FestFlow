import {
  Calendar,
  Users,
  QrCode,
  Award,
  Shield,
  LayoutDashboard,
  Sparkles,
  ArrowRight,
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
  className="relative overflow-hidden py-32 bg-white"
><div className="absolute inset-0">

<div className="absolute left-0 top-20 h-80 w-80 rounded-full bg-pink-300/20 blur-3xl"/>

<div className="absolute right-0 bottom-0 h-[400px] w-[400px] rounded-full bg-blue-300/20 blur-3xl"/>

</div>
      <div className="relative max-w-7xl mx-auto px-6">

        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-pink-100 px-4 py-2 text-pink-600 font-medium">

<Sparkles size={18}/>

Platform Features

</div>

<h2 className="mt-8 text-5xl md:text-6xl font-black leading-tight">

Everything Needed To

<span className="block bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">

Run A Successful Fest

</span>

</h2>

<p className="mt-8 text-xl text-gray-600 max-w-3xl mx-auto">

From registrations to certificates,
FestFlow manages your complete campus event ecosystem.

</p>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8 mt-20">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-[30px] border border-slate-200 bg-white p-8 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
            >
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center mb-6 shadow-lg">

<feature.icon

size={30}

className="text-white"

/>

</div>

              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {feature.title}
              </h3>

              <p className="text-gray-600 leading-relaxed">
                {feature.desc}
              </p>
              <div className="flex items-center gap-2 mt-8 font-semibold text-purple-600 opacity-0 group-hover:opacity-100 transition">

Learn More

<ArrowRight size={18}/>

</div>
<div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-gradient-to-r from-pink-300 to-blue-300 blur-3xl opacity-20 group-hover:opacity-50 transition"/>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Features;