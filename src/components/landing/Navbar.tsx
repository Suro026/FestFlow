import { useNavigate } from "react-router-dom";
import { Menu, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-[#debec8]/40 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <div
          onClick={() => navigate("/")}
          className="flex items-center gap-3 cursor-pointer"
        >
          <img
            src="/logo-re.png"
            alt="FestFlow"
            className="h-14 lg:h-16 w-auto transition-transform duration-300 hover:scale-105"
          />
          <div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight bg-gradient-to-r from-[#b10e6b] to-[#4b41e1] bg-clip-text text-transparent">
              FestFlow
            </h1>
            <p className="text-xs text-[#574048]">Campus Event OS</p>
          </div>
        </div>


        {/* Right */}
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hidden md:inline-flex h-12 items-center gap-2 px-6 rounded-xl border border-[#b10e6b] text-[#b10e6b] font-semibold text-sm hover:bg-[#b10e6b]/5 transition-colors">
                Sign In
                <ChevronDown size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2">
              <DropdownMenuItem
                onClick={() => navigate("/student-login")}
                className="cursor-pointer rounded-xl p-3"
              >
                Student
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/admin-login")}
                className="cursor-pointer rounded-xl p-3"
              >
                Organizer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hidden md:inline-flex h-12 items-center gap-2 px-6 rounded-xl bg-gradient-to-r from-[#b10e6b] to-[#4b41e1] text-white font-semibold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                Get Started
                <ChevronDown size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2">
              <DropdownMenuItem
                onClick={() => navigate("/student-register")}
                className="cursor-pointer rounded-xl p-3"
              >
                Student
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/admin-register")}
                className="cursor-pointer rounded-xl p-3"
              >
                Organizer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button className="lg:hidden text-[#111c2d] p-2">
            <Menu />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;