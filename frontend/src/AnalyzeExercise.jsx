import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function AnalyzeExercise() {
  const {state} = useLocation();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState("");
  const [equipment, setEquipment] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    if (!exercise || !equipment) {
      alert("Please select an exercise and equip");
      return;
    }

    try {
    const res = await fetch("http://127.0.0.1:5000/results", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({

        exercise_name: exercise,
        equipment: equipment,
        weight_kg: state?.weight_kg,      // optional chaining - safely access properties on objects that might not exist 
        height_cm: state?.height_cm
      })
    });

    if (!res.ok) {
      alert(`Server error: ${res.status}`);
      return;
    }

    const data = await res.json();
    navigate("/results_page", {state: {result: data, exercise, equipment}})

  } catch (err) {
    console.error("Fetch failed:", err);
    alert("Could not reach the server. Is Flask running?");
  }
}


  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col items-center justify-center px-6">

      <h1 className="text-4xl font-bold mb-8">
        Analyze Your Exercise
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-md">

        <select
          className="p-3 rounded bg-[#1f1f1f]"
          placeholder="Exercise"
          value={exercise}
          onChange={(e) => setExercise(e.target.value)}
        >
          <option value="" disabled>Select exercise</option>
          <option value="lateral_raises">Lateral Raises</option>
          <option value="tricep_curls">Tricep Curls</option>
        </select>
    
        
        <select
          className="p-5 rounded bg-[#1f1f1f] text-white"
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
        >
          <option value="" disabled>Select equipment type</option>
          <option value="free_weight">Free Weight</option>
          <option value="machine">Machine</option>
        </select>

        <button
          className="bg-blue-500 hover:bg-blue-600 p-3 rounded font-semibold"
          type="submit"
        >
          Analyze

        </button>

      </form>

    </div>
  );
}


export default AnalyzeExercise;