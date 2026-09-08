# npm run dev -- --host 127.0.0.1

"""
app.py  –  FitForm AI  (PostgreSQL edition)
------------------------------------------
New endpoints added on top of the original /results route:

Auth
  POST /register          create account
  POST /login             returns session cookie
  POST /logout

Body metrics
  POST /metrics           save weight/height/age/body_fat
  GET  /metrics           full history for logged-in user

Workouts
  POST /workouts          create a new workout session
  GET  /workouts          list workouts (with exercise count via JOIN)
  GET  /workouts/<id>     single workout + all its exercise logs

Exercise logs
  POST /workouts/<id>/logs   add an exercise to a workout
  GET  /exercise_history      all exercise logs for user, filterable by name

Recommendations
  GET  /recommendations    past recommendations for logged-in user

Progress
  GET  /progress           weight history + per-exercise personal bests
"""

import os
import hashlib
import secrets
from datetime import datetime

import psycopg2
import psycopg2.extras          # RealDictCursor
from flask import Flask, request, session, jsonify
from flask_cors import CORS

from exercise_rules import generate_rule_based_instructions

# ── App setup ───────────────────────────────────────────────────────────────
app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "change-me-in-production")
CORS(app, supports_credentials=True)   # credentials=True lets the browser send cookies

# ── Database connection ─────────────────────────────────────────────────────
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://localhost/fitform"   # override with env var in production
)

def get_db():
    """Return a new psycopg2 connection with RealDictCursor as default."""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    return conn


def query(sql, params=None, *, fetch="all", commit=False):
    """
    Tiny helper:
      fetch="all"  → list of dicts
      fetch="one"  → single dict or None
      fetch="none" → no result (INSERT/UPDATE/DELETE)
    Returns lastrowid if fetch="none" and commit=True.
    """
    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(sql, params or ())
        if fetch == "all":
            result = cur.fetchall()
        elif fetch == "one":
            result = cur.fetchone()
        else:
            result = None
        if commit:
            conn.commit()
        # grab the last inserted id if available
        if fetch == "none" and commit:
            try:
                result = cur.fetchone()   # works when RETURNING id is in query
            except Exception:
                result = None
        return result
    finally:
        conn.close()


# ── Auth helpers ─────────────────────────────────────────────────────────────
def hash_password(pw: str) -> str:
    salt = secrets.token_hex(16)
    h = hashlib.sha256((salt + pw).encode()).hexdigest()
    return f"{salt}:{h}"


def verify_password(pw: str, stored: str) -> bool:
    try:
        salt, h = stored.split(":")
        return hashlib.sha256((salt + pw).encode()).hexdigest() == h
    except Exception:
        return False


def current_user_id():
    return session.get("user_id")


def login_required(f):
    from functools import wraps
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not current_user_id():
            return jsonify({"error": "Login required"}), 401
        return f(*args, **kwargs)
    return wrapper


# ═══════════════════════════════════════════════════════════════════════════
#  AUTH ROUTES
# ═══════════════════════════════════════════════════════════════════════════

@app.route("/register", methods=["POST"])
def register():
    data = request.json or {}
    username = (data.get("username") or "").strip()
    email    = (data.get("email")    or "").strip().lower()
    password = data.get("password",  "")

    if not username or not email or not password:
        return jsonify({"error": "username, email and password are required"}), 400

    # Check uniqueness
    existing = query(
        "SELECT id FROM users WHERE email = %s OR username = %s",
        (email, username), fetch="one"
    )
    if existing:
        return jsonify({"error": "Email or username already taken"}), 409

    pw_hash = hash_password(password)
    row = query(
        "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s) RETURNING id",
        (username, email, pw_hash), fetch="none", commit=True
    )
    user_id = row["id"] if row else None
    session["user_id"] = user_id
    return jsonify({"message": "Account created", "user_id": user_id}), 201


@app.route("/login", methods=["POST"])
def login():
    data  = request.json or {}
    email = (data.get("email") or "").strip().lower()
    pw    = data.get("password", "")

    user = query(
        "SELECT id, username, password_hash FROM users WHERE email = %s",
        (email,), fetch="one"
    )
    if not user or not verify_password(pw, user["password_hash"]):
        return jsonify({"error": "Invalid credentials"}), 401

    session["user_id"] = user["id"]
    return jsonify({"message": "Logged in", "user_id": user["id"], "username": user["username"]})


@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})


@app.route("/me", methods=["GET"])
@login_required
def me():
    user = query(
        "SELECT id, username, email, created_at FROM users WHERE id = %s",
        (current_user_id(),), fetch="one"
    )
    return jsonify(dict(user))


# ═══════════════════════════════════════════════════════════════════════════
#  BODY METRICS
# ═══════════════════════════════════════════════════════════════════════════

@app.route("/metrics", methods=["POST"])
@login_required
def save_metrics():
    data = request.json or {}
    try:
        weight   = float(data["weight_kg"])   if data.get("weight_kg")    else None
        height   = float(data["height_cm"])   if data.get("height_cm")    else None
        body_fat = float(data["body_fat_pct"]) if data.get("body_fat_pct") else None
        age      = int(data["age"])            if data.get("age")          else None
    except (ValueError, TypeError) as e:
        return jsonify({"error": str(e)}), 400

    row = query(
        """INSERT INTO body_metrics (user_id, weight_kg, height_cm, body_fat_pct, age)
           VALUES (%s, %s, %s, %s, %s) RETURNING id""",
        (current_user_id(), weight, height, body_fat, age),
        fetch="none", commit=True
    )
    return jsonify({"message": "Metrics saved", "id": row["id"] if row else None}), 201


@app.route("/metrics", methods=["GET"])
@login_required
def get_metrics():
    rows = query(
        """SELECT weight_kg, height_cm, body_fat_pct, age, recorded_at
           FROM body_metrics
           WHERE user_id = %s
           ORDER BY recorded_at DESC""",
        (current_user_id(),)
    )
    return jsonify([dict(r) for r in rows])


# ═══════════════════════════════════════════════════════════════════════════
#  WORKOUTS
# ═══════════════════════════════════════════════════════════════════════════

@app.route("/workouts", methods=["POST"])
@login_required
def create_workout():
    data = request.json or {}
    name  = data.get("name",  "Workout")
    notes = data.get("notes", "")
    row = query(
        "INSERT INTO workouts (user_id, name, notes) VALUES (%s, %s, %s) RETURNING id",
        (current_user_id(), name, notes), fetch="none", commit=True
    )
    return jsonify({"message": "Workout created", "workout_id": row["id"] if row else None}), 201


@app.route("/workouts", methods=["GET"])
@login_required
def list_workouts():
    """Return all workouts with exercise count (JOIN demo)."""
    rows = query(
        """SELECT w.id, w.name, w.notes, w.performed_at,
                  COUNT(el.id) AS exercise_count
           FROM workouts w
           LEFT JOIN exercise_logs el ON el.workout_id = w.id
           WHERE w.user_id = %s
           GROUP BY w.id
           ORDER BY w.performed_at DESC""",
        (current_user_id(),)
    )
    return jsonify([dict(r) for r in rows])


@app.route("/workouts/<int:workout_id>", methods=["GET"])
@login_required
def get_workout(workout_id):
    """Single workout + all exercise logs (JOIN)."""
    workout = query(
        "SELECT * FROM workouts WHERE id = %s AND user_id = %s",
        (workout_id, current_user_id()), fetch="one"
    )
    if not workout:
        return jsonify({"error": "Workout not found"}), 404

    logs = query(
        """SELECT id, exercise, equipment, sets_done, reps_done, weight_used, notes, logged_at
           FROM exercise_logs
           WHERE workout_id = %s
           ORDER BY logged_at""",
        (workout_id,)
    )
    result = dict(workout)
    result["exercises"] = [dict(l) for l in logs]
    return jsonify(result)


@app.route("/workouts/<int:workout_id>", methods=["DELETE"])
@login_required
def delete_workout(workout_id):
    # Verify ownership
    w = query("SELECT id FROM workouts WHERE id=%s AND user_id=%s",
              (workout_id, current_user_id()), fetch="one")
    if not w:
        return jsonify({"error": "Not found"}), 404
    query("DELETE FROM workouts WHERE id=%s", (workout_id,), fetch="none", commit=True)
    return jsonify({"message": "Workout deleted"})


# ═══════════════════════════════════════════════════════════════════════════
#  EXERCISE LOGS
# ═══════════════════════════════════════════════════════════════════════════

@app.route("/workouts/<int:workout_id>/logs", methods=["POST"])
@login_required
def add_exercise_log(workout_id):
    # Ownership check
    w = query("SELECT id FROM workouts WHERE id=%s AND user_id=%s",
              (workout_id, current_user_id()), fetch="one")
    if not w:
        return jsonify({"error": "Workout not found"}), 404

    data = request.json or {}
    try:
        sets   = int(data["sets_done"])        if data.get("sets_done")   else None
        reps   = int(data["reps_done"])        if data.get("reps_done")   else None
        wt     = float(data["weight_used"])    if data.get("weight_used") else None
    except (ValueError, TypeError) as e:
        return jsonify({"error": str(e)}), 400

    row = query(
        """INSERT INTO exercise_logs
               (workout_id, user_id, exercise, equipment, sets_done, reps_done, weight_used, notes)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
        (workout_id, current_user_id(),
         data.get("exercise"), data.get("equipment"),
         sets, reps, wt, data.get("notes", "")),
        fetch="none", commit=True
    )
    return jsonify({"message": "Log added", "id": row["id"] if row else None}), 201


@app.route("/exercise_history", methods=["GET"])
@login_required
def exercise_history():
    """All exercise logs for user, optionally filtered by exercise name."""
    exercise_filter = request.args.get("exercise")
    if exercise_filter:
        rows = query(
            """SELECT el.id, w.name AS workout_name, el.exercise, el.equipment,
                      el.sets_done, el.reps_done, el.weight_used, el.logged_at
               FROM exercise_logs el
               JOIN workouts w ON w.id = el.workout_id
               WHERE el.user_id = %s AND el.exercise ILIKE %s
               ORDER BY el.logged_at DESC""",
            (current_user_id(), f"%{exercise_filter}%")
        )
    else:
        rows = query(
            """SELECT el.id, w.name AS workout_name, el.exercise, el.equipment,
                      el.sets_done, el.reps_done, el.weight_used, el.logged_at
               FROM exercise_logs el
               JOIN workouts w ON w.id = el.workout_id
               WHERE el.user_id = %s
               ORDER BY el.logged_at DESC""",
            (current_user_id(),)
        )
    return jsonify([dict(r) for r in rows])


# ═══════════════════════════════════════════════════════════════════════════
#  RECOMMENDATIONS  (original /results + history)
# ═══════════════════════════════════════════════════════════════════════════

@app.route("/results", methods=["POST"])
def results():
    data     = request.json or {}
    exercise = data.get("exercise_name")
    equipment = data.get("equipment")

    try:
        weight = float(data.get("weight_kg") or 0)
        height = float(data.get("height_cm") or 0)
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid height or weight values"}), 400

    body = {
        "weight": weight,
        "height": height,
        "age":      data.get("age"),
        "body_fat": data.get("body_fat_pct"),
    }
    instructions = generate_rule_based_instructions(exercise, equipment, body)

    # ── Persist recommendation ────────────────────────────────────────────
    uid = current_user_id()   # None for guests — that's fine (nullable FK)
    query(
        """INSERT INTO recommendations (user_id, exercise, equipment, weight_kg, height_cm, output_text)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (uid, exercise, equipment, weight, height, instructions),
        fetch="none", commit=True
    )

    return jsonify({"exercise": exercise, "instructions": instructions})


@app.route("/recommendations", methods=["GET"])
@login_required
def recommendation_history():
    rows = query(
        """SELECT id, exercise, equipment, weight_kg, height_cm, created_at
           FROM recommendations
           WHERE user_id = %s
           ORDER BY created_at DESC
           LIMIT 50""",
        (current_user_id(),)
    )
    return jsonify([dict(r) for r in rows])


# ═══════════════════════════════════════════════════════════════════════════
#  PROGRESS  (weight trend + personal bests per exercise)
# ═══════════════════════════════════════════════════════════════════════════

@app.route("/progress", methods=["GET"])
@login_required
def progress():
    uid = current_user_id()

    # Weight history
    weight_history = query(
        """SELECT weight_kg, recorded_at
           FROM body_metrics
           WHERE user_id = %s AND weight_kg IS NOT NULL
           ORDER BY recorded_at""",
        (uid,)
    )

    # Personal bests per exercise  (MAX weight used)
    personal_bests = query(
        """SELECT exercise,
                  MAX(weight_used)  AS max_weight,
                  MAX(reps_done)    AS max_reps,
                  COUNT(*)          AS total_sets,
                  MAX(logged_at)    AS last_performed
           FROM exercise_logs
           WHERE user_id = %s
           GROUP BY exercise
           ORDER BY last_performed DESC""",
        (uid,)
    )

    # Workout frequency: workouts per week (last 12 weeks)
    frequency = query(
        """SELECT DATE_TRUNC('week', performed_at) AS week_start,
                  COUNT(*) AS workout_count
           FROM workouts
           WHERE user_id = %s
             AND performed_at > NOW() - INTERVAL '12 weeks'
           GROUP BY week_start
           ORDER BY week_start""",
        (uid,)
    )

    return jsonify({
        "weight_history":  [dict(r) for r in weight_history],
        "personal_bests":  [dict(r) for r in personal_bests],
        "weekly_frequency": [dict(r) for r in frequency],
    })


# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    app.run(debug=True)

"""
recommender.py  —  Content-based exercise recommender
------------------------------------------------------
Each exercise is represented as a feature vector:
  [muscle_group (one-hot), equipment (one-hot), difficulty, movement_pattern (one-hot)]

sklearn cosine_similarity finds the closest exercises to whatever
the user has been doing recently, excluding ones they already did.

Interview talking points:
  - Feature engineering: turning categorical data into numeric vectors
  - Cosine similarity: measures angle between vectors (not magnitude)
  - Content-based filtering: recommends based on item features, not user history
  - numpy: fast vector math
  - scikit-learn: industry-standard ML library
"""

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

# ── Exercise database ────────────────────────────────────────────────────────
# Each exercise has:
#   muscle_group: primary muscles targeted
#   equipment:    what's needed
#   difficulty:   1 (beginner) → 3 (advanced)
#   pattern:      push / pull / hinge / squat / carry / isolation

EXERCISES = [
    # Upper — Push
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

MUSCLES    = ["chest", "shoulders", "triceps", "biceps", "back", "quads", "hamstrings", "calves"]
EQUIPMENTS = ["barbell", "dumbbell", "cable", "machine", "bodyweight"]
PATTERNS   = ["push", "pull", "hinge", "squat", "isolation"]

def _encode(exercise: dict) -> list:
    """
    Turn one exercise dict into a numeric feature vector.
    One-hot encode categorical fields, normalise difficulty to 0-1.

    Vector layout:
      [muscle x8] + [equipment x5] + [difficulty x1] + [pattern x5]
    = 19 dimensions total
    """
    muscle_vec    = [1 if exercise["muscle"]    == m  else 0 for m in MUSCLES]
    equipment_vec = [1 if exercise["equipment"] == eq else 0 for eq in EQUIPMENTS]
    difficulty    = [(exercise["difficulty"] - 1) / 2]   # 1→0.0, 2→0.5, 3→1.0
    pattern_vec   = [1 if exercise["pattern"]   == p  else 0 for p in PATTERNS]

    return muscle_vec + equipment_vec + difficulty + pattern_vec


# Pre-compute the feature matrix once at import time (fast)
_names  = [e["name"] for e in EXERCISES]
_matrix = np.array([_encode(e) for e in EXERCISES], dtype=float)   # shape (20, 19)

# ── Public API ───────────────────────────────────────────────────────────────

def get_similar_exercises(done_exercises: list[str], top_n: int = 4) -> list[dict]:
    """
    Given a list of exercise names the user recently did,
    return top_n recommendations they haven't done yet.

    Args:
        done_exercises: e.g. ["bench_press", "lateral_raises"]
        top_n:          how many to return

    Returns:
        list of dicts with name, muscle, equipment, difficulty, pattern, score
    """
    if not done_exercises:
        # Cold start — return popular beginner exercises
        return [
            {**EXERCISES[i], "score": 1.0}
            for i in [0, 2, 8, 14]   # bench, lateral raises, bicep curl, squat
        ][:top_n]

    # Find indices of exercises the user did (skip unknowns)
    done_indices = [_names.index(ex) for ex in done_exercises if ex in _names]

    if not done_indices:
        return get_similar_exercises([], top_n)

    # Average the feature vectors of all done exercises → user preference vector
    user_vector = _matrix[done_indices].mean(axis=0).reshape(1, -1)   # shape (1, 19)

    # Cosine similarity between user vector and every exercise
    scores = cosine_similarity(user_vector, _matrix)[0]   # shape (20,)

    # Rank, exclude already-done exercises
    ranked = sorted(
        [(score, i) for i, score in enumerate(scores) if _names[i] not in done_exercises],
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
    """Utility — returns all known exercise names (for validation)."""
    return _names.copy()

# ── Add this import at the top of app.py ────────────────────────────────────

from recommender import get_similar_exercises

# ── Add this route to app.py ─────────────────────────────────────────────────
@app.route("/recommendations/similar", methods=["GET"])
@login_required
def similar_exercises():
    """
    Looks at the user's last workout and returns ML-based recommendations
    for exercises they haven't done yet, based on cosine similarity.
    """
    # Grab exercises from user's most recent workout (JOIN demo)
    recent = query(
        """SELECT DISTINCT el.exercise
           FROM exercise_logs el
           JOIN workouts w ON w.id = el.workout_id
           WHERE el.user_id = %s
           ORDER BY el.exercise
           LIMIT 20""",
        (current_user_id(),)
    )

    done = [row["exercise"] for row in recent] if recent else []
    recommendations = get_similar_exercises(done, top_n=4)

    return jsonify({
        "based_on": done,
        "recommendations": recommendations
    })
