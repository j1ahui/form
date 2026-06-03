from flask import Flask, request, session, jsonify
from flask_cors import CORS
from exercise_rules import generate_rule_based_instructions

app = Flask(__name__)
app.config["SECRET_KEY"] = "oooooh-my-keey"

CORS(app)       # allows react to talk to flask

@app.route("/results", methods=["POST"])
def results():
    data = request.json

    exercise = data.get("exercise_name")
    equipment = data.get("equipment")

    try:
        body = {
            "weight": float(data.get("weight_kg")),
            "height": float(data.get("height_kg"))
        }

    except (TypeError, ValueError):
        return jsonify({"error": "Invalid height ot weight values"})

    instructions = generate_rule_based_instructions(exercise, equipment, body)

    return jsonify({"exercise": exercise, "instructions": instructions})


if __name__ == "__main__":
    app.run(debug = True)