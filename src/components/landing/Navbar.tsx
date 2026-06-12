import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-purple-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        
  <div className="flex items-center gap-2 cursor-pointer">

  <img
    src="/logo-re.png"
    alt="FestFlow"
    className="h-24 md:h-28 w-auto"
  />

  <div>
    <h1 className="text-4xl font-extrabold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
      FestFlow
    </h1>

    <p className="text-xs text-gray-500">
      Celebrate • Connect • Experience
    </p>
  </div>

</div>

        <div className="hidden md:flex items-center gap-10 text-gray-600 font-medium">
          <a href="#events" className="hover:text-indigo-600">
            Explore
          </a>
          <a href="#features" className="hover:text-indigo-600">
            Features
          </a>
          <a href="#about" className="hover:text-indigo-600">
How It Works
          </a>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => navigate("/admin-register")}
            className="font-semibold text-purple-700 hover:text-pink-500 transition"
          >
            Organize a Fest
          </button>

          <button
            onClick={() => navigate("/student-register")}
            className="
bg-gradient-to-r
from-pink-500
via-purple-500
to-blue-500
text-white
px-6
py-3
rounded-xl
font-semibold
shadow-lg
hover:scale-105
transition
"
          >
            Participate
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;