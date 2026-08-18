// Fetches ML-based recommendations and renders them on dashboard

import { useEffect, useState } from "react";

const API = "http://127.0.0.1:5000";

const DIFFICULTY_LABEL = { 1: "Beginner", 2: "Intermediate", 3: "Advanced" };            // js object literal (dict)
const DIFFICULTY_COLOR = {
    1: "text-green-400",
    2: "text-yellow-400",
    3: "text-red-400",
}

export default function SimilarExercises() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API}/recommendations/similar`, { credentials: "include" })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setData(d); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="bg-[#1a1a1a] rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-[#2a2a2a] rounded w-1/3 mb-4" />
                <div className="grid grid-cols-2 gap-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-20 bg-[#2a2a2a] rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="bg-[#1a1a1a] rounded-xl p-5">

            {/* Header */}
            <div className="flex items-center justify-between mb-1">
                <h2 className="font-semibold text-white">Recommended for You</h2>
                <span className="text-xs text-gray-500 bg-[#2a2a2a] px-2 py-1 rounded-full">
                    ML · cosine similarity
                </span>
            </div>

            {/* Based on */}
            {data.based_on.length > 0 && (
                <p className="text-gray-500 text-xs mb-4">
                    Based on:{" "}
                    {data.based_on.map(e => e.replace(/_/g, " ")).join(", ")}                 {/* combines array into one string. react evaluates js inside {} and renders the resulting string */}
                </p>
            )}

            {/* Cards */}
            <div className="grid grid-cols-2 gap-3">
                {data.recommendations.map((ex, i) => (
                    <div
                        key={i}
                        className="bg-[#242424] rounded-lg p-3 border border-white/[0.04] hover:border-white/10 transition-colors"
                    >
                        <p className="font-medium text-sm text-white capitalize mb-1">
                            {ex.name.replace(/_/g, " ")}
                        </p>
                        <p className="text-gray-500 text-xs capitalize mb-2">
                            {ex.muscle} · {ex.equipment.replace(/_/g, " ")}
                        </p>
                        <div className="flex items-center justify-between">
                            <span className={`text-xs ${DIFFICULTY_COLOR[ex.difficulty]}`}>
                                {DIFFICULTY_LABEL[ex.difficulty]}
                            </span>
                            <span className="text-xs text-gray-600">
                                {Math.round(ex.score * 100)}% match
                            </span>
                        </div>
                    </div>
                ))}
            </div>

        </div>

    );
}

