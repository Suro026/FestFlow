import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Calendar,
  MapPin,
  ArrowRight,
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

      {/* Hero */}
      <section className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-20">

          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Explore Fests
          </h1>

          <p className="text-xl text-blue-100 max-w-3xl">
            Discover technical fests, hackathons,
            workshops and competitions happening across campuses.
          </p>

          <div className="mt-8 bg-white rounded-xl flex items-center px-4 py-3 max-w-xl">
            <Search className="h-5 w-5 text-gray-400" />

            <input
              type="text"
              placeholder="Search fests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 outline-none px-3 text-black"
            />
          </div>

        </div>
      </section>

      {/* Fest Cards */}
      <section className="max-w-7xl mx-auto px-6 py-12">

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">

          {filteredFests.map((fest) => (
            <div
              key={fest.id}
              className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300"
            >

              <img
                src={fest.image}
                alt={fest.name}
                className="h-56 w-full object-cover"
              />

              <div className="p-6">

                <h2 className="text-2xl font-bold mb-2">
                  {fest.name}
                </h2>

                <p className="text-gray-600 font-medium">
                  {fest.college}
                </p>

                <div className="flex items-center gap-2 text-gray-500 mt-3">
                  <MapPin className="h-4 w-4" />
                  {fest.location}
                </div>

                <div className="flex items-center gap-2 text-gray-500 mt-2">
                  <Calendar className="h-4 w-4" />
                  {fest.date}
                </div>

                <div className="mt-3 inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                  {fest.events} Events Available
                </div>

                <p className="text-gray-600 mt-4 line-clamp-3">
                  {fest.description}
                </p>

                <button
                  onClick={() => enterFest(fest.id)}
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  Enter Fest
                  <ArrowRight className="h-4 w-4" />
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
