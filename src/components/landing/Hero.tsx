import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Hero = () => {
  const navigate = useNavigate();
  const heroWords = [
    "Campus Events",
    "Hackathons",
    "Technical Fests",
    "Workshops",
    "Competitions",
    "Student Communities",
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroWords.length);
    }, 1000);

    return () => clearInterval(interval);
  }, [heroWords.length]);

  return (
    <section className="relative overflow-hidden bg-white">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-32 h-96 w-96 rounded-full bg-pink-300/30 blur-3xl"></div>
        <div className="absolute top-32 right-0 h-[450px] w-[450px] rounded-full bg-blue-300/20 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/2 h-[350px] w-[350px] rounded-full bg-purple-300/20 blur-3xl"></div>
      </div>
      <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-20">

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
<div className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-pink-50 px-4 py-2 text-sm font-medium text-pink-600">

🚀 India's Smart Campus Event Platform

</div>

<h1 className="mt-8 text-5xl md:text-7xl font-black leading-tight">

Manage

<span className="block bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">

{heroWords[currentIndex]}

</span>

Like Never Before.

</h1>

<p className="mt-8 text-xl leading-9 text-gray-600 max-w-xl">

One powerful platform to manage registrations, QR tickets,
attendance, food distribution, certificates,
and complete fest operations.

</p>
<div className="flex flex-wrap gap-5 mt-10">

<button
  type="button"
  onClick={() => navigate("/student-register")}
  className="rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 px-8 py-4 text-white font-semibold shadow-xl hover:scale-105 transition"
>

Join Events

</button>

<button
  type="button"
  onClick={() => navigate("/admin-register")}
  className="rounded-2xl border bg-white px-8 py-4 font-semibold hover:bg-gray-50"
>

Create a Fest

</button>

</div>
<div className="grid grid-cols-3 gap-5 mt-14">

<div>

<h2 className="text-3xl font-black">

120+

</h2>

<p className="text-gray-500">

Events

</p>

</div>

<div>

<h2 className="text-3xl font-black">

5000+

</h2>

<p className="text-gray-500">

Participants

</p>

</div>

<div>

<h2 className="text-3xl font-black">

50+

</h2>

<p className="text-gray-500">

Colleges

</p>

</div>

</div>
</div>
<div className="relative"><div className="rounded-[32px] border bg-white shadow-2xl p-8">

<img

src="/image.png"

className="rounded-2xl"

alt="Dashboard"

/>
<div className="absolute -left-10 top-16 rounded-2xl bg-white p-4 shadow-xl">

🎟

QR Verified

</div>
<div className="absolute -right-8 bottom-16 rounded-2xl bg-white p-4 shadow-xl">

🏆

Certificates Ready

</div>

</div></div></div>
</div>

    </section>
  );
};

export default Hero;