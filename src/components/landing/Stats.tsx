const Stats = () => {
  const stats = [
  {
    emoji: "🎉",
    number: "100+",
    title: "Events Hosted",
  },
  {
    emoji: "👥",
    number: "5000+",
    title: "Participants",
  },
  {
    emoji: "🏆",
    number: "2000+",
    title: "Certificates Issued",
  },
  {
    emoji: "🎓",
    number: "50+",
    title: "Colleges",
  }
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-white via-purple-50 to-pink-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">

  <h2 className="text-4xl md:text-5xl font-bold">
    Trusted by Event Organizers
  </h2>

  <p className="text-gray-600 mt-4 text-lg">
    Everything you need to run successful college festivals.
  </p>

</div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">

          {stats.map((item, index) => (
            <div
              key={index}
              className="
text-center
bg-white
rounded-3xl
p-8
shadow-xl
border
border-purple-100
hover:-translate-y-2
hover:shadow-2xl
transition-all
duration-300
"
            >
              <h2 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
                {item.number}
              </h2>

              <p className="mt-3 text-gray-600 font-medium">
                {item.title}
              </p>
            </div>
          ))}

        </div>

      </div>
    </section>
  );
};

export default Stats;