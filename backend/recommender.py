import numpy as np
from sklearn.metrics.pairwise import cosine_similarity


# ── Exercise database ────────────────────────────────────────────────────────
# Each exercise has:
#   muscle_group: primary muscles targeted
#   equipment:    what's needed
#   difficulty:   1 (beginner) → 3 (advanced)
#   pattern:      push / pull / hinge / squat / carry / isolation


EXERCISES = [
    # Upper - Push
    {"name": "bench_press",       "muscle": "chest",     "equipment": "barbell",    "difficulty": 2, "pattern": "push"},
    {"name": "overhead_press",    "muscle": "shoulders", "equipment": "barbell",    "difficulty": 2, "pattern": "push"},
    {"name": "lateral_raises",    "muscle": "shoulders", "equipment": "dumbbell",   "difficulty": 1, "pattern": "isolation"},
    {"name": "tricep_pushdown",   "muscle": "triceps",   "equipment": "cable",      "difficulty": 1, "pattern": "isolation"},
    {"name": "tricep_curls",      "muscle": "triceps",   "equipment": "dumbbell",   "difficulty": 1, "pattern": "isolation"},
    {"name": "chest_fly",         "muscle": "chest",     "equipment": "dumbbell",   "difficulty": 1, "pattern": "isolation"},
    {"name": "push_up",           "muscle": "chest",     "equipment": "bodyweight", "difficulty": 1, "pattern": "push"},
    {"name": "dips",              "muscle": "triceps",   "equipment": "bodyweight", "difficulty": 2, "pattern": "push"},

    # Upper — Pull
    {"name": "bicep_curl",        "muscle": "biceps",    "equipment": "dumbbell",   "difficulty": 1, "pattern": "isolation"},
    {"name": "pull_up",           "muscle": "back",      "equipment": "bodyweight", "difficulty": 3, "pattern": "pull"},
    {"name": "barbell_row",       "muscle": "back",      "equipment": "barbell",    "difficulty": 2, "pattern": "pull"},
    {"name": "face_pull",         "muscle": "shoulders", "equipment": "cable",      "difficulty": 1, "pattern": "pull"},
    {"name": "hammer_curl",       "muscle": "biceps",    "equipment": "dumbbell",   "difficulty": 1, "pattern": "isolation"},

    # Lower
    {"name": "squat",             "muscle": "quads",     "equipment": "barbell",    "difficulty": 2, "pattern": "squat"},
    {"name": "deadlift",          "muscle": "hamstrings","equipment": "barbell",    "difficulty": 3, "pattern": "hinge"},
    {"name": "romanian_deadlift", "muscle": "hamstrings","equipment": "barbell",    "difficulty": 2, "pattern": "hinge"},
    {"name": "leg_press",         "muscle": "quads",     "equipment": "machine",    "difficulty": 1, "pattern": "squat"},
    {"name": "leg_curl",          "muscle": "hamstrings","equipment": "machine",    "difficulty": 1, "pattern": "isolation"},
    {"name": "calf_raise",        "muscle": "calves",    "equipment": "machine",    "difficulty": 1, "pattern": "isolation"},
    {"name": "lunges",            "muscle": "quads",     "equipment": "dumbbell",   "difficulty": 2, "pattern": "squat"},
]


# ── Feature encoding ─────────────────────────────────────────────────────────

MUSCLES = ["chest", "shoulders", "triceps", "biceps", "back", "quads", "hamstrings", "calves"]
EQUIPMENTS = ["barbell", "dumbbell", "cable", "machine", "bodyweight"]
PATTERNS = ["push", "pull", "hinge", "squat", "isolation"]


# features = muscle, equip, difficulty, pattern (keys of dict) 
# vector = ordered list of numbers 
# one-hot encoding = only one value is 1, rest are 0's
# normalising as cosine works better when features are on the same scale (one feature could have a greater influence)
# instead convert:
#   1 → 0.0
#   2 → 0.5
#   3 → 1.0         (now every feature is between 0 and 1)
# vector layout = joining multiple smaller vectors together
# dimension = one pos in the vector

# cosine uses 2 vectors to calculate a similarity score between -1 and 1 or 0 and 1 since we got no negative vectors (the more matching features, the closer their vectors point in the same direction and the higher the similarity score)

def _encode(exercise: dict) -> list:                                        # before cosine similarity can compare two exercises, every exercise must be converted into numbers (cosine cannot compare strings)
    """
    Turn one exercise dict into a numeric feature vector.                   
    One-hot encode categorical fields, normalise difficulty to 0-1.

    Vector layout:
        [muscle x8] + [equipment x5] + [difficulty x1] + [pattern x5]
    = 19 dimensions total
    """

    muscle_vec = [1 if exercise["muscle"] == m else 0 for m in MUSCLES]                         # list comprehension
    equipment_vec = [1 if exercise["equipment"] == eq else 0 for eq in EQUIPMENTS]
    difficulty = [(exercise["difficulty"] - 1) / 2]
    pattern_vec = [1 if exercise["pattern"] == p else 0 for p in PATTERNS]

    return muscle_vec + equipment_vec + difficulty + pattern_vec                        # list concatenation

# precompute the feature matrix once at import (fast)
_names = [e["name"] for e in EXERCISES]
_matrix = np.array([_encode(e) for e in EXERCISES], dtype=float)        # shape (20, 19). format that cosine_similarity() expects (a matrix where each row is an item (exercise), and each col is a feature)


# ── Public API ───────────────────────────────────────────────────────────────


def get_similar_exercises(done_exercises: list[str], top_n: int = 4) -> list[dict]:
    """
    Given a list of exercise names the user recently did,
    return top_n recommendations they havent done yet.

    Args:
        done_exercises: e.g ["bench_press", "lateral_raises"]
        top_n: how many to return

    Returns:
        list of dicts with name, muscle, equipment, difficulty, pattern, score
    """

    if not done_exercises:
        # cold start - return popular beginner exercises
        return [
            {**EXERCISES[i], "score": 1.0}              # unpack another dict into this one. adds score key
            for i in [0, 2, 8, 14]
        ][:top_n]

    # finding indices of exercises the user did (skip unknowns)
    done_indices = [_names.index(ex) for ex in done_exercises if ex in _names]    

    if not done_indices:
        return get_similar_exercises([], top_n) 

    # average the feature vectors of all done exercises (this gives user preference vector)
    user_vector = _matrix[done_indices].mean(axis=0).reshape(1, -1)         # shape is now (1, 19). fancy indexing. axis=0 means average down each col. axis=1 avgs each row. after averaging, you have a 1 dimensional array (19,). cosine similarity expects 2 dimensional

    # cosine similarity between user vector and every exercise 
    scores = cosine_similarity(user_vector, _matrix)[0]             # shape (20,). user_vector.shape = (1, 19). _matrix.shape = (20, 19). becomes 1 x 20 as scikit compares every row in first matrix to every row in second matrix. [0] selects first and only row. [0] removes unnecessary outer dimension, making it easier to loop

    # rank, exclude already done exercises  
    ranked = sorted(
        [(score, i) for i, score in enumerate(scores) if _names[i] not in done_exercises],          # append to list if _names[i] not in done_exercises]
        reverse=True

    )

    return [
        {
            **EXERCISES[i],
            "score": round(float(score), 3),
        }
        for score, i in ranked[:top_n]
    ]


def get_all_exercise_names() -> list[str]:
    """
    Utility - returns all known exercise names (for validation).
    """
    return _names.copy()