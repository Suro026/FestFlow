import {
  User,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
const Workflow = () => {
  return (
<section
  id="workflow"
  className="relative overflow-hidden py-32 bg-slate-50"
><div className="absolute inset-0">
<div className="absolute left-0 top-20 h-80 w-80 rounded-full bg-pink-300/20 blur-3xl"/>
<div className="absolute right-0 bottom-0 h-[450px] w-[450px] rounded-full bg-blue-300/20 blur-3xl"/>
</div>
        <div className="relative max-w-7xl mx-auto px-6">

        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-4 py-2 text-purple-600 font-semibold">

<Sparkles size={18}/>

Simple Workflow

</div>

<h2 className="mt-8 text-5xl md:text-6xl font-black">

One Platform.

<span className="block bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">

Two Powerful Experiences.

</span>

</h2>

<p className="mt-8 max-w-3xl mx-auto text-xl text-gray-600">

Whether you are participating in an event or organizing one,
FestFlow simplifies every step.

</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 mt-20">

          {/* Student Flow */}
          <div className="group rounded-[32px] border bg-white p-10 shadow-lg hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-4 mb-8">
              <User className="text-indigo-600" size={36} />
              <h3 className="text-3xl font-bold">
                🎓 For Participants
              </h3>
            </div>

            <div className="space-y-6">

              <div className="flex items-center gap-4 rounded-2xl border p-5 hover:bg-purple-50 transition">
  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white font-bold">

1

</div>

<div>

<h4 className="font-semibold">

Login & Explore Fests

</h4>

<p className="text-sm text-gray-500">

Browse available events instantly.

</p>

</div>
</div>

<div className="flex items-center gap-4 rounded-2xl border p-5 hover:bg-purple-50 transition">
  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white font-bold">

2

</div>

<div>

<h4 className="font-semibold">

Register

</h4>

<p className="text-sm text-gray-500">

Join solo or team events

</p>

</div>
</div>

<div className="flex items-center gap-4 rounded-2xl border p-5 hover:bg-purple-50 transition">
 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white font-bold">

3

</div>

<div>

<h4 className="font-semibold">

QR Ticket

</h4>

<p className="text-sm text-gray-500">

Receive digital ticket

</p>

</div>
</div>

<div className="flex items-center gap-4 rounded-2xl border p-5 hover:bg-purple-50 transition">
 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white font-bold">

4

</div>

<div>

<h4 className="font-semibold">

Attendance

</h4>

<p className="text-sm text-gray-500">

Scan QR during entry

</p>

</div>
</div>

<div className="flex items-center gap-4 rounded-2xl border p-5 hover:bg-purple-50 transition">
 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white font-bold">

5

</div>

<div>

<h4 className="font-semibold">

Food Collection

</h4>

<p className="text-sm text-gray-500">

Collect meals using QR

</p>

</div>
</div>

<div className="flex items-center gap-4 rounded-2xl border p-5 hover:bg-purple-50 transition">
 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white font-bold">

6

</div>

<div>

<h4 className="font-semibold">

  Certificate

</h4>

<p className="text-sm text-gray-500">

Download your certificate after the event

</p>

</div>
</div>

            </div>
          </div>

          {/* Organizer Flow */}
          <div className="group rounded-[32px] border bg-white p-10 shadow-lg hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-4 mb-8">
              <ShieldCheck className="text-blue-600" size={36} />
              <h3 className="text-3xl font-bold">
                🎉 For Organizers
              </h3>
            </div>

            <div className="space-y-6">

              <div className="flex items-center gap-4 rounded-2xl border p-5 hover:bg-purple-50 transition">
 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white font-bold">

1

</div>

<div>

<h4 className="font-semibold">

Register Fest

</h4>

<p className="text-sm text-gray-500">

Create your organization and register your fest.
</p>

</div>
</div>

<div className="flex items-center gap-4 rounded-2xl border p-5 hover:bg-purple-50 transition">
 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white font-bold">

2

</div>

<div>

<h4 className="font-semibold">

Super Admin

</h4>

<p className="text-sm text-gray-500">

Manage your committee and assign roles.

</p>

</div>
</div>

<div className="flex items-center gap-4 rounded-2xl border p-5 hover:bg-purple-50 transition">
 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white font-bold">

3
</div>

<div>

<h4 className="font-semibold">

Create Events

</h4>

<p className="text-sm text-gray-500">

Publish competitions, workshops, and more.

</p>

</div>
</div>

<div className="flex items-center gap-4 rounded-2xl border p-5 hover:bg-purple-50 transition">
 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white font-bold">

4

</div>

<div>

<h4 className="font-semibold">

Registrations

</h4>

<p className="text-sm text-gray-500">

Track participants and manage registrations.

</p>

</div>
</div>

<div className="flex items-center gap-4 rounded-2xl border p-5 hover:bg-purple-50 transition">
 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white font-bold">

5

</div>

<div>

<h4 className="font-semibold">

Attendance

</h4>

<p className="text-sm text-gray-500">

Scan QR tickets and track attendance.

</p>

</div>
</div>

<div className="flex items-center gap-4 rounded-2xl border p-5 hover:bg-purple-50 transition">
 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white font-bold">

6

</div>

<div>

<h4 className="font-semibold">

Certificates

</h4>

<p className="text-sm text-gray-500">

Generate automatically for participants.

</p>

</div>
</div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default Workflow;