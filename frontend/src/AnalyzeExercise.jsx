import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PoseDetection from "./components/PoseDetection";

const POSE_SUPPORTED = ["bicep_curl", "hammer_curl", "lateral_raises"];        // array in js (would be a list in python)

function AnalyzeExercise() {
  const {state} = useLocation();
  const navigate = useNavigate();

  const [exercise, setExercise] = useState("");
  const [equipment, setEquipment] = useState("");
  const [mode, setMode] = useState("rule");
  const [showPose, setShowPose] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!exercise || !equipment) {
      alert("Please select an exercise and equip");
      return;
    }

    if (mode === "pose") {
      if (!POSE_SUPPORTED.includes(exercise)) {           
        alert("Pose detection is currently only available for Bicep Curl. More coming soon ;))");
        return;
      }
      setShowPose(true);
      return;
    }
 
    try {
    const res = await fetch("http://127.0.0.1:5000/results", {              // passing an object as second arg 
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        exercise_name: exercise,
        equipment: equipment,
        weight_kg: state?.weight_kg,      // optional chaining - safely access properties on objects that might not exist 
        height_cm: state?.height_cm
      }),                                 // comma separates properties ("there could be another property after body in this object"). makes adding new properties later easier and results in cleaner Git diffs
    });

    if (!res.ok) {
      alert(`Server error: ${res.status}`);
      return;
    }

    const data = await res.json();
    navigate("/results_page", {state: {result: data, exercise, equipment}})

  } catch (err) {
    console.error("Fetch failed:", err);
    alert("Could not reach the server. Is Flask running ho?");
  }
}

const poseAvailable = POSE_SUPPORTED.includes(exercise);

  return (
    <>
      {/* Pose detection overlay */}
      {showPose && (<PoseDetection exercise={exercise} onClose={() => setShowPose(false)} />)}

      <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col items-center justify-center px-6">
        <h1 className="text-4xl font-bold mb-2">Execute with Perfection</h1>
        <p className="text-gray-500 text-sm mb-8">Choose your analysis method below</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-md">

          {/* Exercise */}
          <select
            className="p-3 rounded-lg bg-[#1f1f1f] text-white"
            value={exercise}
            onChange={(e) => { setExercise(e.target.value); setMode("rule"); }}
          >
            <option value="" disabled>Select Exercise</option>
            <option value="bicep_curl">Bicep Curl</option>
            <option value="hammer_curl">Hammer Curls</option>
            <option value="lateral_raises">Lateral Raises</option>
            <option value="tricep_curls">Tricep Curls</option>
          </select>

          {/* Equipment */}
          <select
            className="p-3 rounded-lg bg-[#1f1f1f] text-white"
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
          >
            <option value="" disabled>Select Equipment</option>
            <option value="free_weight">Body Weight</option>
            <option value="machine">Machine</option>
            <option value="bodyweight">Bodyweight</option>
          </select>

          {/* Analysis mode dropdown */}
          <div className="bg-[#1a1a1a] rounded-lg p-4">
            <p className="text-gray-400 text-xs mb-3 uppercase tracking-wider">Analysis Method</p>
            <div className="flex flex-col gap-2">

              {/* Rule-based option */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="mode"
                  value="rule"
                  checked={mode === "rule"}
                  onChange={() => setMode("rule")}
                  className="mt-0.5 accent-blue-500"
                />
                <div>
                  <p className="text-sm font-medium text-white">Proportion Analysis</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Personalised instructions based on your height, weight and equipment !!!!!!!
                  </p>
                </div>
              </label>

              {/* Pose detection option */}
              <label className={`flex items-start gap-3 cursor-pointer ${!poseAvailable ? "opacity-40" : ""}`}>
                <input
                  type="radio"
                  name="mode"
                  value="pose"
                  checked={mode === "pose"}
                  onChange={() => setMode("pose")}
                  disabled={!poseAvailable}
                  className="mt-0.5 accent-blue-500"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">Pose Detection</p>
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                      CV
                    </span>
                    {!poseAvailable && exercise && (
                      <span className="text-xs text-gray-600">— Bicep Curl only as of now.. other exercises coming real soon</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Motion tracking via MediaPipe - counts reps · live feedback
                  </p>
                </div>
              </label>

            </div>
          </div>

          <button
            className="bg-blue-500 hover:bg-blue-600 p-3 rounded-lg font-semibold transition-colors"
            type="submit"
          >
            {mode === "pose" ? "Open Camera" : "Analyze"}
          </button>

        </form>
      </div>
    </>
  );
}


export default AnalyzeExercise;