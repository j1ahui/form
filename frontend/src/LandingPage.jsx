import { useNavigate } from "react-router-dom";

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f0f0f] text-white px-6">
      
      <h1 className="text-5xl font-bold mb-4 text-center">
        FORM.
      </h1>

      <p className="text-gray-400 text-lg mb-10 text-center max-w-xl">
        Get real-time technique feedback and personalized exercise instructions powered by AI logic.
      </p>

      <button
        onClick={() => navigate("/analyze_comp")}
        className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-xl text-white font-semibold transition"
      >
        Get Started
      </button>

    </div>
  );
}

export default LandingPage;