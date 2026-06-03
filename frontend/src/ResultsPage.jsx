import { useLocation, useNavigate } from "react-router-dom";

function ResultsPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { result, exercise, equipment } = state || {};

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col items-center justify-center px-6">
      <h1 className="text-4xl font-bold mb-2">Your Results</h1>
      <p className="text-gray-400 mb-8">{exercise} — {equipment?.replace("_", " ")}</p>

      {result ? (
        <div className="bg-[#1a1a1a] p-6 rounded max-w-md w-full">
          <h2 className="text-xl font-bold mb-4">{result.exercise}</h2>
          <div className="whitespace-pre-line text-gray-300">{result.instructions}</div>
        </div>
      ) : (
        <p className="text-gray-500">No results found.</p>
      )}

      <button
        onClick={() => navigate("/")}
        className="mt-8 bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded font-semibold"
      >
        Start Over
      </button>
    </div>
  );
}

export default ResultsPage;