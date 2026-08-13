import os
import hashlib
import secrets
from datetime import datetime

import psycopg2                 # python lib used to connect to a postgresql database 
import psycopg2.extras
from flask import Flask, request, session, jsonify          # importing objects from Flask package 
from flask_cors import CORS
from exercise_rules import generate_rule_based_instructions
from recommender import get_similar_exercises

app = Flask(__name__)                       # creating flask object/instance (initialiased through Flask(__name__))
# app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY","oooooh-my-keey")
app.config["SECRET_KEY"] = "oooooh-my-keey"
app.config["SESSION_COOKIE_SAMESITE"] = "None"
app.config["SESSION_COOKIE_SECURE"] = False
CORS(app, supports_credentials=True, origins=["http://127.0.0.1:5173"])       # allows react to talk to flask

DATABASE_URL = os.environ.get(             # database_url is a variable  
    "DATABASE_URL",
    "postgresql://localhost/form"
)

def get_db():
    """
    return a new psycopg2 connection with RealDictCursor (result comes back as dict) as default
    """
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    return conn

def query(sql, params=None, *, fetch="all", commit=False):

    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(sql, params or ())      # use params or empty tuple
        if fetch == "all":
            result = cur.fetchall()
        elif fetch == "one":
            result = cur.fetchone()
        else:
            result = None
        if commit:
            conn.commit()                   # allows commit=True (helper func)
        if fetch == "none" and commit:
            try:
                result = cur.fetchone()
            except Exception:
                result = None
        return result
    finally:
        conn.close()

def hash_password(pw: str) -> str:
    salt = secrets.token_hex(16)            # secrets = module. token_hex = function in the secrets module. 16 = argument 
    h = hashlib.sha256((salt + pw).encode()).hexdigest()        # salt + pw = string concatenation. creating a sha256 hash object. hexdigest() = method that returns the hash as a hex string 
    return f"{salt}:{h}"


def verify_password(pw: str, stored: str) -> bool:
    try: 
        salt, h = stored.split(":")
        return hashlib.sha256((salt + pw).encode()).hexdigest() == h
    except Exception:
        return False


def current_user_id():
    return session.get("user_id")           # session acts as a dict


def login_required(f):                      # f = me() func
    from functools import wraps 
    @wraps(f)                               # appears to Python as og  me() function
    def wrapper(*args, **kwargs):           # *'s mean collect arguments 
        if not current_user_id():
            return jsonify({"error": "Login required"}), 401
        return f(*args, **kwargs)           # *'s mean unpack arguments
    return wrapper


@app.route("/register", methods=["POST"])
def register():
    data = request.json or {}                   # empty dict 
    username = (data.get("username") or "").strip()             # without "", None.strip() would cause an AttributeError (if username = None)
    email = (data.get("email") or "").strip().lower()
    password = data.get("password", "")

    if not username or not email or not password:
        return jsonify({"error": "username, email and password are required."}), 400

    existing = query(
        "SELECT id FROM users WHERE email = %s OR username = %s",       # first arg (sql) 
        (email, username), fetch="one"                                  # second arg (params). fetch = one returns first matching row 
    )

    if existing:
        return jsonify({"error:": "Email or username already taken"}), 409

    pw_hash = hash_password(password)
    row = query(
        "INSERT into users (username, email, password_hash) VALUES (%s, %s, %s) RETURNING id", 
        (username, email, pw_hash), fetch="none", commit=True           # causes helper func to execute 
    )

    user_id = row["id"] if row else None
    session["user_id"] = user_id
    return jsonify({"message": "Account created", "user_id": user_id}), 201 


@app.route("/login", methods=["POST"])
def login():
    data = request.json or {}
    email = (data.get("email") or "").strip().lower()
    pw = data.get("password", "")

    user = query(
        "SELECT id, username, password_hash FROM users WHERE email = %s",
        (email,), fetch="one"
    )

    if not user or not verify_password(pw, user["password_hash"]):
        return jsonify({"error": "Invalid credentials bro"}), 401

    session["user_id"] = user["id"]
    return jsonify({"message": "Logged in", "user_id": user["id"], "username": user["username"]})


@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})


@app.route("/me", methods=["GET"])
@login_required                         # before running me(), first run login_required function (gives error if /me is called and user isnt logged in)
def me():                               # points to login_required(), in login_required(), @wraps(f) copies metadata from me() to wrapper() 
    user = query(
        "SELECT id, username, email, created_at FROM users WHERE id = %s",          # database libraries expect params to be passed as tuples 
        (current_user_id(),), fetch="one"           # , = creates a 1 element tuple 
    )
    return jsonify(dict(user))


@app.route("/metrics", methods=["POST"])
@login_required
def save_metrics():
    data = request.json or {}
    try:
        weight = float(data["weight_kg"]) if data.get("weight_kg") else None
        height = float(data["height_cm"]) if data.get("height_cm") else None 
        body_fat = float(data["body_fat_pct"]) if data.get("body_fat_pct") else None 
        age = int(data["age"]) if data.get("age") else None 

    except (ValueError, TypeError) as e:
        return jsonify({"error": str(e)},), 400 

    row = query(
        """INSERT INTO body_metrics (user_id, weight_kg, height_cm, body_fat, age)
           VALUES (%s, %s, %s, %s) RETURNING id""",
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


@app.route("/workouts", methods=["POST"])
@login_required
def create_workout():
    data = request.json or {}
    name = data.get("name", "Workout")
    notes = data.get("notes", "")

    row = query(
        "INSERT INTO workouts (user_id, name, notes) VALUES (%s, %s, %s) RETURNING id",         # gives id immediately for use so you dont need to run another query (add exercise to that workout)
        (current_user_id(), name, notes), fetch="none", commit=True
    )
    return jsonify({"message": "Workout created", "workout_id": row["id"] if row else None}), 201
    

@app.route("/workouts", methods=["GET"])
@login_required
def list_workouts():

    rows = query(
        """SELECT w.id, w.name, w.notes, w.performed_at,
                COUNT(el.id) AS exercise_count
            FROM workouts w
            LEFT JOIN exercise_logs el ON el.workout_id = w.id
            WHERE w.user_id = %s                    
            GROUP BY w.id
            ORDER BY w.performed_at DESC""",
            (current_user_id(),)
    
    )                                               # param binding in WHERE w.user_id = %s                    
    return jsonify([dict(r) for r in rows])         # list comprehension. converts each database row into a normal python dict then into JSON string/text (before: python data structures, after: json text)


@app.route("/workouts/<int:workout_id>", methods=["GET"])           # route param
@login_required
def get_workout(workout_id):
    """single workout with all exercises logged"""

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
    result["exercises"] = [dict(l) for l in logs]        # list comprehension. list is also assigned to "exercise" key
    return jsonify(result)


@app.route("/workouts/<int:workout_id>", methods=["DELETE"])
@login_required
def delete_workout(workout_id):

    w = query("SELECT id FROM workouts WHERE id=%s AND user_id=%s",
        (workout_id, current_user_id()), fetch="one")

    if not w:
        return jsonify({"error": "Not found"}), 404
    query("DELETE FROM workouts WHERE id=%s", (workout_id), fetch="none", commit=True)
    return jsonify({"message": "Workout deleted"})


@app.route("/workouts/<int:workout_id>/logs", methods=["POST"])
@login_required
def add_exercise_log(workout_id):

    w = query("SELECT id FROM workouts WHERE id=%s AND user_id=%s",
              (workout_id, current_user_id()), fetch="one")
    
    if not w:
        return jsonify({"error": "Workout not found"}), 404
    
    data = request.json or {}
    try:
        sets = int(data["sets_done"]) if data.get("sets_done") else None
        reps = int(data["reps_done"]) if data.get("reps_done") else None 
        wt = float(data["weight_used"]) if data.get("weight_used") else None
    except (ValueError, TypeError) as e:
        return jsonify({"error": str(e)}), 400
    
    row = query(
        """INSERT INTO exercise_logs (workout_id, user_id, exercise, equipment, sets_done, reps_done, weight_used, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
        (workout_id, current_user_id(), data.get("exercise"), data.get("equipment"), sets, reps, wt, data.get("notes", "")),
        fetch="none", commit=True
    )

    return jsonify({"message": "Log added", "id": row["id"] if row else None}), 201


@app.route("/exercise_history", methods=["GET"])
@login_required
def exercise_history():
    """all exercise logs for user, optionally filtered by exercise name"""

    exercise_filter = request.args.get("exercise")      # args is an attribute/property of request. contains query/url params from url

    if exercise_filter:
        rows = query (
            """SELECT el.id, w.name AS workout_name, el.exercise, el.equipment,
                      el.sets_done, el.reps_done, el.weight_used, el.logged_at
                FROM exercise_logs el
                JOIN workouts ON w.id = el.workout_id
                WHERE el.user_id = %s AND el.exercise ILIKE %s          
                ORDER BY el.logged_at DESC""",
                (current_user_id(), f"%{exercise_filter}%")              # postgresql's case-insensitive of LIKE. when exercise_filter = "bench", f"%{exercise_filter}" becomes "%bench". % = matches strings (can be anywhere in a word - word at end, start, both)
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


@app.route("/results", methods=["POST"])
def results():
    data = request.json or {}
    exercise = data.get("exercise_name")
    equipment = data.get("equipment")

    try:
        weight = float(data.get("weight_kg") or 0)
        height = float(data.get("height_cm") or 0)
    except {TypeError, ValueError}:
        return jsonify({"error": "Invalid height or weight values"}), 400

    body = {
        "weight": weight,
        "height": height,
        "age": data.get("age"),
        "body_fat": data.get("body_fat_pct"),
    }
    instructions = generate_rule_based_instructions(exercise, equipment, body)

    uid = current_user_id()
    query(
        """INSERT INTO recommendations (user_id, exercise, equipment, weight_kg, height_cm, output_text)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (uid, exercise, equipment, weight, height, instructions),
        fetch="none", commit=True
    )

    return jsonify({"exercise": exercise, "instructions": instructions})


@app.route("/recommendations", methods=["GET"])            # route is a method (you call it with ())
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


@app.route("/progress", methods=["GET"])
@login_required
def progress():
    uid = current_user_id()

    weight_history = query(
        """SELECT weight_kg, recorded_at
           FROM body_metrics
           WHERE user_id = %s AND weight_kg IS NOT NULL
           ORDER BY recorded_at""",
           (uid,)
    )

    personal_bests = query(                             # max weight used 
        """SELECT exercise,
                  MAX(weight_used) AS max_weight,
                  MAX(reps_done) AS max_reps,
                  COUNT(*) AS total_sets,
                  MAX(logged_at) AS last_performed
            FROM exercise_logs
            WHERE user_id = %s
            GROUP BY exercise
            ORDER BY last_performed DESC """,
            (uid,)

    )

    frequency = query(                              # workouts per week (last 12 weeks)
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
        "weight_history": [dict(r) for r in weight_history],
        "personal_bests": [dict(r) for r in personal_bests],
        "weekly_frequency": [dict(r) for r in frequency]

    })


@app.route("/recommendations/similar", methods=["GET"])
@login_required
def similar_exercises():
    """
    Looks at the user's last workout and returns ML-based recommendations
    for exercises they havent done yet, based on cosine similarity
    """

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


# @app.route("/results", methods=["POST"])
# def results():
#     data = request.json

#     exercise = data.get("exercise_name")
#     equipment = data.get("equipment")

#     try:
#         body = {
#             "weight": float(data.get("weight_kg")),
#             "height": float(data.get("height_kg"))
#         }

#     except (TypeError, ValueError):
#         return jsonify({"error": "Invalid height ot weight values"})

#     instructions = generate_rule_based_instructions(exercise, equipment, body)

#     return jsonify({"exercise": exercise, "instructions": instructions})


if __name__ == "__main__":
    app.run(debug = True)