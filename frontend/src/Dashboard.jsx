// src/pages/Dashboard.jsx
// Shows: user greeting, quick-start buttons, recent workouts, weight progress, personal bests

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import SimilarExercises from "./components/SimilarExercises";

const API = "http://127.0.0.1:5000";

async function apiFetch(path, opts = {}) {              // this function is refactoring authcontext.jsx . opts = empty object 
  const res = await fetch(API + path, {                 // string concatenation 
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...opts,                                            // making a copy of properties in opts to insert (the request specific parts such as method: "POST", body: JSON.stringify({email, password}) from authcontext functions) 
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// -- FINAL FETCH:
// fetch("http://127.0.0.1:5000/login", {
//   credentials: "include",
//   headers: { "Content-Type": "application/json" },
//   method: "POST",
//   body: JSON.stringify({ email, password })
// });

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [workouts, setWorkouts] = useState([]);
  const [progress, setProgress] = useState(null);
  const [recommendations, setRecs] = useState([]);
  const [activeTab, setActiveTab] = useState("workouts");
  const [newWorkoutName, setNewWorkoutName] = useState("");
  const [loadingNew, setLoadingNew] = useState(false);

  useEffect(() => {
    apiFetch("/workouts").then(setWorkouts).catch(console.error);
    apiFetch("/progress").then(setProgress).catch(console.error);
    apiFetch("/recommendations").then(setRecs).catch(console.error);
  }, []);               // [] = dependency array

  async function startWorkout() {
    const name = newWorkoutName.trim() || `Workout ${new Date().toLocaleDateString()}`;       // toLocalDateString = converts to readable string. use newWorkoutName.trim(), else use text on right side of ||
    setLoadingNew(true);
    try {
      const data = await apiFetch("/workouts", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      navigate(`/workout/${data.workout_id}`);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingNew(false);
    }
  }

  async function deleteWorkout(id) {
    if (!confirm("Delete this workout?")) return;
    await apiFetch(`/workouts/${id}`, { method: "DELETE" });
    setWorkouts(ws => ws.filter(w => w.id !== id));             // ws = current workouts array. format: ws = [{id: 1, name: arms}]
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white px-6 py-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Hey, {user?.username} 👋</h1>
          <p className="text-gray-400 text-sm mt-1">Track your fitness journey</p>
        </div>
        <button onClick={logout} className="text-gray-500 hover:text-white text-sm">
          Log out
        </button>
      </div>

      {/* Quick start */}
      <div className="bg-[#1a1a1a] rounded-xl p-5 mb-6">
        <h2 className="font-semibold mb-3">Start New Workout</h2>
        <div className="flex gap-3">
          <input
            value={newWorkoutName}
            onChange={e => setNewWorkoutName(e.target.value)}
            placeholder="Workout name (optional)"
            className="flex-1 p-3 rounded bg-[#2a2a2a] text-white text-sm"
          />
          <button
            onClick={startWorkout}
            disabled={loadingNew}
            className="bg-blue-500 hover:bg-blue-600 px-5 rounded font-semibold disabled:opacity-50"
          >
            {loadingNew ? "..." : "Start"}
          </button>
        </div>
        <button
          onClick={() => navigate("/analyze")}
          className="mt-3 w-full border border-gray-700 hover:border-gray-500 p-3 rounded text-sm text-gray-300"
        >
          Analyze an Exercise (Rule-based)
        </button>
      </div>

      <SimilarExercises />

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[#1a1a1a] rounded-lg p-1">
        {["workouts", "progress", "recommendations"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
              activeTab === tab ? "bg-blue-500 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── WORKOUTS TAB ── */}
      {activeTab === "workouts" && (
        <div className="space-y-3">
          {workouts.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">No workouts yet. Start one above bruh!</p>
          )}
          {workouts.map(w => (
            <div key={w.id} className="bg-[#1a1a1a] rounded-xl p-4 flex justify-between items-start">
              <div
                className="cursor-pointer flex-1"
                onClick={() => navigate(`/workout/${w.id}`)}
              >
                <p className="font-semibold">{w.name}</p>
                <p className="text-gray-400 text-xs mt-1">          
                  {w.exercise_count} exercise{w.exercise_count !== 1 ? "s" : ""} ·{" "}          {/* " " = space character. s for plural of exercise (exercises) */}       
                  {new Date(w.performed_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => deleteWorkout(w.id)}
                className="text-gray-600 hover:text-red-400 text-xs ml-4"
              >
                delete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── PROGRESS TAB ── */}
      {activeTab === "progress" && progress && (
        <div className="space-y-6">                   {/* renders if "progress" and progress are truthy */}
          {/* Weight history */}
          {progress.weight_history.length > 0 && (
            <div className="bg-[#1a1a1a] rounded-xl p-5">
              <h3 className="font-semibold mb-3">Weight History</h3>
              <div className="space-y-2">
                {progress.weight_history.slice(-8).map((m, i) => (          /* return last 8 entries. m = current weight, i = index  */
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-400">{new Date(m.recorded_at).toLocaleDateString()}</span>
                    <span>{m.weight_kg} kg</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Personal bests */}
          {progress.personal_bests.length > 0 && (
            <div className="bg-[#1a1a1a] rounded-xl p-5">
              <h3 className="font-semibold mb-3">Personal Bests</h3>
              <div className="space-y-3">
                {progress.personal_bests.map((pb, i) => (
                  <div key={i} className="border-b border-gray-800 pb-3 last:border-0 last:pb-0">
                    <p className="font-medium capitalize">{pb.exercise.replace(/_/g, " ")}</p>
                    <div className="flex gap-4 text-xs text-gray-400 mt-1">
                      <span>Max weight: {pb.max_weight ?? "—"} kg</span>
                      <span>Max reps: {pb.max_reps ?? "—"}</span>
                      <span>Total sets: {pb.total_sets}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weekly frequency */}
          {progress.weekly_frequency.length > 0 && (
            <div className="bg-[#1a1a1a] rounded-xl p-5">
              <h3 className="font-semibold mb-3">Weekly Frequency (last 12 weeks)</h3>
              <div className="flex gap-2 flex-wrap">
                {progress.weekly_frequency.map((w, i) => (
                  <div key={i} className="text-center">
                    <div
                      className="bg-blue-500 rounded"
                      style={{ height: `${Math.max(8, w.workout_count * 16)}px`, width: "32px" }}         /* ensures bar remains visible with min height of 8 */
                    />
                    <p className="text-xs text-gray-500 mt-1">{w.workout_count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {progress.weight_history.length === 0 && progress.personal_bests.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">
              Log a workout and save your metrics to see progress!
            </p>
          )}
        </div>
      )}

      {/* ── RECOMMENDATIONS TAB ── */}
      {activeTab === "recommendations" && (
        <div className="space-y-3">
          {recommendations.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">No recommendations yet.</p>
          )}
          {recommendations.map(r => (
            <div key={r.id} className="bg-[#1a1a1a] rounded-xl p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold capitalize">{r.exercise?.replace(/_/g, " ")}</p>
                  <p className="text-gray-400 text-xs mt-1">
                    {r.equipment} · {r.weight_kg} kg · {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
