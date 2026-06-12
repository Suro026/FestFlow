import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Hero = () => {
  const navigate = useNavigate();

const [currentIndex, setCurrentIndex] = useState(0);

useEffect(() => {
  const interval = setInterval(() => {
    setCurrentIndex((prev) => (prev + 1) % heroWords.length);
  }, 1000);

  return () => clearInterval(interval);
}, []);

const heroWords = [
  "Celebrate.",
  "Connect.",
  "Experience.",
  "Compete.",
  "Learn.",
  "Create.",
];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100">
      <div className="max-w-7xl mx-auto px-6 py-28">

        {/* Floating Cards */}
        <div className="absolute top-32 left-20 bg-red-100 shadow-xl rounded-2xl px-5 py-3 rotate-[-8deg] hidden lg:block">
          🎟 QR Ticket
        </div>

        <div className="absolute top-40 right-20 bg-yellow-100 shadow-xl rounded-2xl px-5 py-3 rotate-[10deg] hidden lg:block">
          🏆 Certificates
        </div>

        <div className="absolute bottom-40 left-40 bg-blue-100 shadow-xl rounded-2xl px-5 py-3 rotate-[12deg] hidden lg:block">
          👥 Team Events
        </div>

        <div className="absolute bottom-32 right-40 bg-green-100 shadow-xl rounded-2xl px-5 py-3 rotate-[-10deg] hidden lg:block">
          📅 Event Registration
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-tight text-center">

  <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
    {heroWords[currentIndex]}
  </span>

</h1>
          <p className="max-w-4xl mx-auto mt-8 text-xl text-gray-600 text-center">
            India's Smart Fest & Event Management Platform.

Host festivals, manage registrations,
track attendance, distribute food,
generate certificates and create unforgettable experiences.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-5 mt-10">

            <button
              onClick={() => navigate("/student-register")}
              className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-indigo-700"
            >
              Participate in Events
            </button>

            <button
              onClick={() => navigate("/admin-register")}
              className="bg-white text-purple-700 border border-purple-300 text-indigo-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-indigo-50"
            >
              Organize a Fest
            </button>

          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-12">

  <div className="bg-white px-6 py-3 rounded-xl shadow">
    🎉 120+ Events
  </div>

  <div className="bg-white px-6 py-3 rounded-xl shadow">
    🏆 5000+ Participants
  </div>

  <div className="bg-white px-6 py-3 rounded-xl shadow">
    🎓 50+ Colleges
  </div>

</div>

        </div>
    </section>
  );
};

export default Hero;