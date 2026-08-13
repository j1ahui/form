import { useState } from "react";                     
import { useNavigate } from "react-router-dom";         

function AnalyzeComp() {                            // component 
  const [weight, setWeight] = useState("");         // array destructuring - unpacking into a list
  const [height, setHeight] = useState("");
  const navigate = useNavigate();                   // returns a function

  async function handleSubmit(e) {
    e.preventDefault();
    if (!weight || !height || isNaN(weight) || isNaN(height)) {
        alert("Please enter a valid height and weight");
        return;
    }
    navigate("/analyze", {state: { weight_kg: parseFloat(weight), height_cm: parseFloat(height)}})             // passing object 
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col items-center justify-center px-6">     

      <h1 className="text-4xl font-bold mb-8">
        Your Composition... 
      </h1>     

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-md">       

        <input
          className="p-3 rounded bg-[#1f1f1f]"
          placeholder="Weight (kg)"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />

        <input
          className="p-3 rounded bg-[#1f1f1f]"
          placeholder="Height (cm)"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
        />

        <button
          className="bg-blue-500 hover:bg-blue-600 p-3 rounded font-semibold"
          type="submit"
        >
          Continue
        </button>

      </form>

    </div>
  );
}

export default AnalyzeComp;