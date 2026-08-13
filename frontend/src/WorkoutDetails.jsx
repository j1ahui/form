// src/pages/WorkoutDetail.jsx
// View a workout session and log individual exercises to it

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API = "http://127.0.0.1:5000";

async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

const EXERCISE_OPTIONS = [
  { value: "lateral_raises",  label: "Lateral Raises" },
  { value: "tricep_curls",    label: "Tricep Curls" },
  { value: "bench_press",     label: "Bench Press" },
  { value: "bicep_curl",      label: "Bicep Curl" },
  { value: "squat",           label: "Squat" },
  { value: "deadlift",        label: "Deadlift" },
];

export default function WorkoutDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState(null);
  const [form, setForm] = useState({
    exercise: "", equipment: "free_weight",
    sets_done: "", reps_done: "", weight_used: "", notes: ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch(`/workouts/${id}`).then(setWorkout).catch(() => navigate("/dashboard"));
  }, [id]);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function addLog(e) {
    e.preventDefault();
    if (!form.exercise) { setError("Pick an exercise"); return; }
    setError(""); setSaving(true);
    try {
      await apiFetch(`/workouts/${id}/logs`, {
        method: "POST",
        body: JSON.stringify({
          exercise:    form.exercise,
          equipment:   form.equipment,
          sets_done:   form.sets_done   || null,
          reps_done:   form.reps_done   || null,
          weight_used: form.weight_used || null,
          notes:       form.notes,
        }),
      });
      // Refresh
      const updated = await apiFetch(`/workouts/${id}`);
      setWorkout(updated);
      setForm(prev => ({ ...prev, exercise: "", sets_done: "", reps_done: "", weight_used: "", notes: "" }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!workout) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white px-6 py-8 max-w-2xl mx-auto">
      <button onClick={() => navigate("/dashboard")} className="text-gray-400 hover:text-white text-sm mb-6">
        ← Dashboard
      </button>

      <h1 className="text-2xl font-bold mb-1">{workout.name}</h1>
      <p className="text-gray-500 text-sm mb-8">{new Date(workout.performed_at).toLocaleString()}</p>

      {/* Log form */}
      <div className="bg-[#1a1a1a] rounded-xl p-5 mb-8">
        <h2 className="font-semibold mb-4">Log Exercise</h2>
        <form onSubmit={addLog} className="grid grid-cols-2 gap-3">
          <select
            name="exercise" value={form.exercise} onChange={handleChange}
            className="col-span-2 p-3 rounded bg-[#2a2a2a] text-white text-sm"
          >
            <option value="" disabled>Select exercise</option>
            {EXERCISE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            name="equipment" value={form.equipment} onChange={handleChange}
            className="p-3 rounded bg-[#2a2a2a] text-white text-sm"
          >
            <option value="free_weight">Free Weight</option>
            <option value="machine">Machine</option>
            <option value="bodyweight">Bodyweight</option>
            <option value="resistance_band">Resistance Band</option>
          </select>

          <input
            name="weight_used" value={form.weight_used} onChange={handleChange}
            placeholder="Weight (kg)" type="number" step="0.5"
            className="p-3 rounded bg-[#2a2a2a] text-white text-sm"
          />
          <input
            name="sets_done" value={form.sets_done} onChange={handleChange}
            placeholder="Sets" type="number"
            className="p-3 rounded bg-[#2a2a2a] text-white text-sm"
          />
          <input
            name="reps_done" value={form.reps_done} onChange={handleChange}
            placeholder="Reps" type="number"
            className="p-3 rounded bg-[#2a2a2a] text-white text-sm"
          />
          <input
            name="notes" value={form.notes} onChange={handleChange}
            placeholder="Notes (optional)"
            className="col-span-2 p-3 rounded bg-[#2a2a2a] text-white text-sm"
          />

          {error && <p className="col-span-2 text-red-400 text-xs">{error}</p>}

          <button
            type="submit" disabled={saving}
            className="col-span-2 bg-blue-500 hover:bg-blue-600 p-3 rounded font-semibold disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add Exercise"}
          </button>
        </form>
      </div>

      {/* Exercise list */}
      <h2 className="font-semibold mb-3">Exercises Logged ({workout.exercises.length})</h2>
      {workout.exercises.length === 0 && (
        <p className="text-gray-500 text-sm">None yet — log your first exercise above.</p>
      )}
      <div className="space-y-3">
        {workout.exercises.map(ex => (
          <div key={ex.id} className="bg-[#1a1a1a] rounded-xl p-4">
            <p className="font-medium capitalize">{ex.exercise.replace(/_/g, " ")}</p>
            <div className="flex gap-4 text-xs text-gray-400 mt-1 flex-wrap">
              <span>{ex.equipment}</span>
              {ex.weight_used && <span>{ex.weight_used} kg</span>}
              {ex.sets_done   && <span>{ex.sets_done} sets</span>}
              {ex.reps_done   && <span>{ex.reps_done} reps</span>}
            </div>
            {ex.notes && <p className="text-gray-500 text-xs mt-1">{ex.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
