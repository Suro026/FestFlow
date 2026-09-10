import { useNavigate } from "react-router-dom";

const Hero = () => {
  const navigate = useNavigate();

  const institutions = [
    {
      short: "IITB",
      full: "Indian Institute of Technology, Bombay",
      logo: "iitb.png",
    },
    {
      short: "IIM",
      full: "Indian Institute of Management",
      logo: "iima.png",
    },
    {
      short: "DU",
      full: "University of Delhi",
      logo: "du.jpg",
    },
    {
      short: "TBIT",
      full: "Techno Bengal Institute of Technology",
      logo: "tbit.jpg",
    },
    {
      short: "JU",
      full: "Jadavpur University",
      logo: "ju.svg",
    },
    {
      short: "NITR",
      full: "National Institute of Technology Rourkela",
      logo: "nitr.svg",
    },
    {
      short: "VIT",
      full: "Vellore Institute of Technology",
      logo: "vit.svg",
    },
    {
      short: "SRM",
      full: "SRM Institute of Science & Technology",
      logo: "srm.jpg",
    },
  ];

  return (
    <section className="relative overflow-hidden bg-[#f9f9ff] pt-24 pb-24 px-6">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#d23284] rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#645efb] rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>

      <div className="max-w-7xl mx-auto text-center relative z-10 flex flex-col items-center">
        <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tight mb-6">
          <span className="block text-[#111c2d]">Experience. Connect.</span>
          <span className="block bg-gradient-to-r from-[#b10e6b] to-[#4b41e1] bg-clip-text text-transparent">
            Elevate Your Campus Life.
          </span>
        </h1>

        <p className="text-lg md:text-xl leading-8 text-[#574048] max-w-2xl mb-10">
          FestFlow is India's smartest campus event network. Discover
          trending fests, secure digital tickets, and build your
          professional network all in one place.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <button
            type="button"
            onClick={() => navigate("/student-register")}
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#b10e6b] to-[#4b41e1] text-white font-semibold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
          >
            Explore Events
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin-register")}
            className="px-8 py-4 rounded-xl bg-white text-[#b10e6b] font-semibold border border-[#debec8]/60 hover:bg-[#d8e3fb]/40 transition-colors"
          >
            Organize a Fest
          </button>
        </div>

        {/* Trusted Institutions Strip */}
        <div className="w-full max-w-5xl">
          <p className="text-xs font-bold tracking-widest uppercase text-[#574048]/70 mb-8">
            Trusted by Leading Indian Institutions
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-6 items-center">
            {institutions.map((inst) => (
              <div
                key={inst.short}
                title={inst.full}
                className="flex flex-col items-center justify-center gap-1 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-default"
              >
                {inst.logo ? (
                  <img
                    src={inst.logo}
                    alt={inst.full}
                    className="w-14 h-14 rounded-full object-cover border border-[#debec8]/40 bg-white shadow-sm"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-r from-[#b10e6b] to-[#4b41e1] flex items-center justify-center text-white font-black text-sm shadow-sm">
                    {inst.short}
                  </div>
                )}
                <span className="text-[10px] font-semibold text-[#111c2d] text-center leading-tight max-w-[90px]">
                  {inst.full}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;