import { User, ShieldCheck } from "lucide-react";

const Workflow = () => {
  return (
<section className="py-24 bg-gradient-to-b from-white via-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-6">

        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-extrabold">

  <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
    How FestFlow Works
  </span>

</h2>
          <p className="mt-5 text-xl text-gray-500">
            A seamless workflow for students, organizers and event teams.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10">

          {/* Student Flow */}
          <div className="bg-gradient-to-br from-pink-100 via-purple-50 to-white border rounded-3xl p-10 shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <User className="text-indigo-600" size={36} />
              <h3 className="text-3xl font-bold">
                🎓 For Participants
              </h3>
            </div>

            <div className="space-y-6">

              <div className="bg-white rounded-xl p-4 shadow-sm">
  1️⃣ Login & Explore Fests
</div>

<div className="bg-white rounded-xl p-4 shadow-sm">
  2️⃣ Register for Events
</div>

<div className="bg-white rounded-xl p-4 shadow-sm">
  3️⃣ Receive QR Ticket
</div>

<div className="bg-white rounded-xl p-4 shadow-sm">
  4️⃣ Attendance Verification
</div>

<div className="bg-white rounded-xl p-4 shadow-sm">
  5️⃣ Food Collection
</div>

<div className="bg-white rounded-xl p-4 shadow-sm">
  6️⃣ Download Certificate
</div>

            </div>
          </div>

          {/* Organizer Flow */}
          <div className="bg-gradient-to-br from-blue-100 via-purple-50 to-white border rounded-3xl p-10 shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <ShieldCheck className="text-blue-600" size={36} />
              <h3 className="text-3xl font-bold">
                🎉 For Organizers
              </h3>
            </div>

            <div className="space-y-6">

              <div className="bg-white rounded-xl p-4 shadow-sm">
  1️⃣ Register Your Fest
</div>

<div className="bg-white rounded-xl p-4 shadow-sm">
  2️⃣ Become Super Admin
</div>

<div className="bg-white rounded-xl p-4 shadow-sm">
  3️⃣ Create Events & Admins
</div>

<div className="bg-white rounded-xl p-4 shadow-sm">
  4️⃣ Manage Registrations
</div>

<div className="bg-white rounded-xl p-4 shadow-sm">
  5️⃣ Track Attendance
</div>

<div className="bg-white rounded-xl p-4 shadow-sm">
  6️⃣ Generate Certificates
</div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default Workflow;