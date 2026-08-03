const Stats = () => {
  const institutes = [
    "TechNova University",
    "CampusX Institute",
    "FutureTech College",
    "Innovation University",
    "NextGen Campus",
    "CodeSphere Institute",
  ];

  return (
    <section className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-6">

        <div className="text-center mb-16">

          <p className="uppercase tracking-[0.35em] text-sm font-semibold text-gray-500">
            TRUSTED ECOSYSTEM
          </p>

          <h2 className="mt-5 text-4xl md:text-5xl font-black text-gray-900">
            Designed for Modern Campus Communities
          </h2>

          <p className="mt-5 max-w-3xl mx-auto text-lg text-gray-600">
            Built to support college festivals, hackathons, workshops,
            technical events and student organizations with a scalable
            digital infrastructure.
          </p>

        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">

          {institutes.map((item, index) => (
            <div
              key={index}
              className="rounded-2xl border border-gray-200 bg-gray-50 h-24 flex items-center justify-center text-center px-4 hover:bg-white hover:shadow-lg transition"
            >
              <span className="font-bold text-gray-700">
                {item}
              </span>
            </div>
          ))}

        </div>

      </div>
    </section>
  );
};

export default Stats;