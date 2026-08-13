import { useNavigate } from "react-router-dom";

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-[#0f0f0f] text-white">     

      {/* NAV */}
      <nav className="flex justify-between items-center px-8 py-5 border-b border-white/[0.08]">
        <span className="text-sm font-medium tracking-widest">FORM.</span>
        <button
          onClick={() => navigate("/login")}
          className="text-white/50 hover:text-white text-sm px-4 py-1.5 border border-white/15 hover:border-white/30 rounded-lg transition-all"
          >Login
          </button>   
        </nav>

      
      {/* NAV */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-5xl font-bold mb-4 text-center">FORM.</h1>

        <p className="text-gray-400 text-lg mb-10 text-center max-w-xl">Get real-time technique feedback and personalized exercise instructions powered by AI logic.</p>

        <button
          onClick={() => navigate("/analyze_comp")}
          className="bg-blue-500 hover:bg-blue-600 px-8 py-3 rounded-xl text-white font-semibold transition"
        >
          Get Started
        </button>

      </div>
    </div>
  );
}

export default LandingPage;