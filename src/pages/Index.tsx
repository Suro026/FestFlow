import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GraduationCap, Calendar, Zap, Shield, Users } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation Bar */}
      <nav className="bg-slate-900/80 backdrop-blur border-b border-blue-500/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">TechSpire Events</span>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => navigate('/student-login')}
                variant="outline"
                className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
              >
                Student Login
              </Button>
              <Button 
                onClick={() => navigate('/admin-login')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Admin Login
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Your Gateway to <span className="text-blue-400">Campus Events</span>
            </h1>
            <p className="text-xl text-slate-300 mb-8 leading-relaxed">
              Join TechSpire Events Portal - the trusted platform for discovering, registering, and participating in exciting campus events. Build skills, network with peers, and create memorable experiences.
            </p>
            <div className="flex gap-4">
              <Button 
                onClick={() => navigate('/student-register')}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Get Started
              </Button>
              <Button 
                variant="outline"
                size="lg"
                className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
              >
                Learn More
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl p-8 border border-blue-500/30">
              <Calendar className="h-32 w-32 text-blue-400 mx-auto mb-6" />
              <p className="text-center text-slate-300 text-lg">10+ Events Available</p>
              <p className="text-center text-slate-400">Project competitions, coding challenges, and more</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold text-white text-center mb-12">Why Choose TechSpire?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-800/50 border border-blue-500/20 rounded-xl p-8 hover:border-blue-500/40 transition">
            <Shield className="h-12 w-12 text-blue-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-3">Trusted Platform</h3>
            <p className="text-slate-300">Official event registration system with secure ticket generation and attendance tracking.</p>
          </div>
          <div className="bg-slate-800/50 border border-blue-500/20 rounded-xl p-8 hover:border-blue-500/40 transition">
            <Users className="h-12 w-12 text-blue-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-3">Team Collaboration</h3>
            <p className="text-slate-300">Register with your team members, manage team details, and stay connected throughout events.</p>
          </div>
          <div className="bg-slate-800/50 border border-blue-500/20 rounded-xl p-8 hover:border-blue-500/40 transition">
            <Calendar className="h-12 w-12 text-blue-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-3">Diverse Events</h3>
            <p className="text-slate-300">Project competitions, coding challenges, hackathons, debates, and treasure hunts.</p>
          </div>
        </div>
      </section>

      {/* Events Preview */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold text-white text-center mb-12">Featured Events</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { name: 'Electronovation', desc: 'IoT Hardware Projects - 6 members' },
            { name: 'Envision', desc: 'Software Development - 5 members' },
            { name: 'Genfusion', desc: 'AI/ML Projects - 5 members' },
            { name: 'Code Ardor', desc: 'Coding MCQ Competition' },
          ].map((event, idx) => (
            <div key={idx} className="bg-slate-800/50 border border-blue-500/20 rounded-xl p-6 hover:border-blue-500/40 transition">
              <h3 className="text-lg font-bold text-blue-400 mb-2">{event.name}</h3>
              <p className="text-slate-300">{event.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-12">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Join?</h2>
          <p className="text-blue-100 mb-8 text-lg">Register now and start participating in amazing events</p>
          <Button 
            onClick={() => navigate('/student-login')}
            size="lg"
            className="bg-white text-blue-600 hover:bg-slate-100 font-bold"
          >
            Login to Your Account
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-blue-500/20 bg-slate-900/50 py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-slate-400">
          <p>&copy; 2024 TechSpire Events Portal. All rights reserved.</p>
          <p className="text-sm mt-2">Trusted platform for campus event management</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
