import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Calendar,
  MapPin,
  ArrowRight,
  Moon,
  Sun,
} from "lucide-react";

const mockFests = [
  {
    id: "bits2bytes",
    name: "Bits2Bytes 2k26",
    college: "Techno Main Salt Lake",
    location: "Kolkata",
    date: "15 Jun - 17 Jun",
    events: 12,
    image:
      "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1200",
    description:
      "Annual technology fest featuring hackathons, coding contests, AI challenges and workshops.",
  },
  {
    id: "innovision",
    name: "Innovision 2026",
    college: "ABC Engineering College",
    location: "Bangalore",
    date: "20 Jun - 22 Jun",
    events: 18,
    image:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200",
    description:
      "Innovation focused fest with startup showcases, project exhibitions and technical events.",
  },
  {
    id: "hacksphere",
    name: "HackSphere",
    college: "XYZ Institute",
    location: "Hyderabad",
    date: "25 Jun - 27 Jun",
    events: 10,
    image:
      "https://images.unsplash.com/photo-1523580494863-6f3031224c94?q=80&w=1200",
    description:
      "Hackathons, coding competitions, cybersecurity challenges and workshops.",
  },
];

const Fests = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filteredFests = mockFests.filter(
    (fest) =>
      fest.name.toLowerCase().includes(search.toLowerCase()) ||
      fest.college.toLowerCase().includes(search.toLowerCase())
  );

  const enterFest = (festId: string) => {
    sessionStorage.setItem("selectedFest", festId);
    navigate("/student-dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Navigation */}

<nav className="sticky top-0 z-50 border-b border-white/20 bg-white/40 backdrop-blur-xl">

  <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">

    <div className="flex items-center gap-3">

      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 shadow-lg">

        <span className="text-lg font-bold text-white">
          F
        </span>

      </div>

      <div>

        <h2 className="text-xl font-extrabold">
          FestFlow
        </h2>

        <p className="text-xs text-slate-500">
          Explore Campus Fests
        </p>

      </div>

    </div>

    <button className="rounded-full p-2 hover:bg-slate-100">

      <Moon className="h-5 w-5" />

    </button>

  </div>

</nav>

{/* Hero */}

<section className="relative overflow-hidden bg-gradient-to-br from-pink-700 via-indigo-600 to-purple-700 py-24 text-white">

  <div className="absolute inset-0 bg-black/10" />

  <div className="relative mx-auto max-w-7xl px-6">

    <div className="max-w-3xl">

      <p className="mb-4 font-semibold uppercase tracking-[0.3em] text-pink-200">

        Welcome Back

      </p>

      <h1 className="text-6xl font-black leading-tight">

        Find Your Next

        <br />

        Great Experience

      </h1>

      <p className="mt-8 text-xl leading-9 text-white/90">

        Connect with clubs,

        join hackathons,

        workshops,

        technical fests,

        and never miss a campus opportunity.

      </p>

      <div className="relative mt-10 max-w-xl">

        <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

        <input
          type="text"
          placeholder="Search fests, colleges or cities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-16 w-full rounded-2xl border border-white/30 bg-white/90 pl-14 pr-5 text-slate-900 shadow-2xl outline-none backdrop-blur-xl focus:ring-4 focus:ring-pink-300"
        />

      </div>

      <div className="mt-8 flex flex-wrap gap-3">

        {["Hackathons", "Workshops", "Tech Fest", "Cultural"].map((item) => (

          <button
            key={item}
            className="rounded-full border border-white/30 bg-white/20 px-5 py-2 text-sm font-semibold backdrop-blur-xl transition hover:bg-white/30"
          >
            {item}
          </button>

        ))}

      </div>

    </div>

  </div>

</section>

      <section className="relative -mt-12 z-20 max-w-7xl mx-auto px-6 pb-20">

  <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">

    {filteredFests.map((fest) => (

      <div
        key={fest.id}
        className="overflow-hidden rounded-3xl border border-white/40 bg-white/50 backdrop-blur-2xl shadow-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
      >

        <div className="relative h-56">

          <img
            src={fest.image}
            alt={fest.name}
            className="h-full w-full object-cover"
          />

          <div className="absolute right-4 top-4 rounded-full bg-white/90 px-4 py-1 text-xs font-bold text-pink-600 shadow">

            Registration Open

          </div>

        </div>

        <div className="p-6">

          <h2 className="text-2xl font-extrabold text-slate-900">

            {fest.name}

          </h2>

          <p className="mt-1 font-medium text-slate-500">

            {fest.college}

          </p>

          <div className="mt-5 space-y-2">

            <div className="flex items-center gap-2 text-slate-500">

              <MapPin className="h-4 w-4" />

              <span>{fest.location}</span>

            </div>

            <div className="flex items-center gap-2 text-slate-500">

              <Calendar className="h-4 w-4" />

              <span>{fest.date}</span>

            </div>

          </div>

          <span className="mt-5 inline-block rounded-lg bg-pink-100 px-3 py-1 text-xs font-bold text-pink-700">

            {fest.events} Events Available

          </span>

          <p className="mt-5 line-clamp-2 text-sm leading-7 text-slate-600">

            {fest.description}

          </p>

          <button
            onClick={() => enterFest(fest.id)}
            className="group mt-7 flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 font-bold text-white transition hover:opacity-90"
          >

            Enter Fest

            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />

          </button>

        </div>

      </div>

    ))}

  </div>

</section>
    </div>
  );
};

export default Fests;
