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
    <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-2xl border-b border-slate-200/60">

<div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

{/* Logo */}

<div
onClick={()=>navigate("/")}
className="flex items-center gap-3 cursor-pointer">

<img
src="/logo-re.png"
alt="FestFlow"
 className="h-18 lg:h-20 w-auto transition-transform duration-300 hover:scale-105"
/>

<div>

<h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-pink-500 via-purple-600 to-blue-500 bg-clip-text text-transparent">

FestFlow

</h1>

<p className="text-xs text-gray-500">

Campus Event OS

</p>

</div>

</div>

{/* Navigation */}

<div className="hidden lg:flex items-center gap-10">

<a
href="#features"
className="text-gray-600 hover:text-purple-600 transition"
>

Features

</a>

<a
href="#workflow"
className="text-gray-600 hover:text-purple-600 transition"
>

How it Works

</a>

<a
href="#footer"
className="text-gray-600 hover:text-purple-600 transition"
>

About

</a>

</div>

{/* Right */}

<div className="flex items-center gap-4">

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button
      className="hidden md:inline-flex h-12 items-center gap-2 px-7 rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 hover:scale-[1.02] transition-all"
    >
      login
      <ChevronDown size={18} />
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent
    align="end"
    className="w-56 rounded-2xl p-2"
  >
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
    <button
      className="hidden md:flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white font-semibold shadow-lg hover:scale-105 transition"
    >
      Register
      <ChevronDown size={18} />
    </button>
  </DropdownMenuTrigger>

  <DropdownMenuContent
    align="end"
    className="w-56 rounded-2xl p-2"
  >
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
<button className="lg:hidden">

<Menu/>

</button>

</div>

</div>

</nav>
  );
};

export default Navbar;