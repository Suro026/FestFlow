import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Stats from "@/components/landing/Stats";
import Features from "@/components/landing/Features";
import Workflow from "@/components/landing/Workflow";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="bg-white">
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <Workflow />
      <Footer />
    </div>
  );
};

export default Index;