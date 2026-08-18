def generate_rule_based_instructions(exercise, equipment, body):
    base_instructions = {
        "lateral_raises": [
            "Stand straight, hold dumbbells at your sides.",
            "Raise arms to shoulder height without shrugging shoulders.",
            "Lower slowly back to sides."
        ],
        "bench_press": [
            "Lie on bench, grip bar slightly wider than shoulders.",
            "Lower bar to chest slowly, keeping elbows at ~45° angle.",
            "Press bar up until arms are fully extended, keeping your back flat."
        ],
        "bicep_curl": [
            "Stand tall with your feet shoulder-width apart and hold the dumbbells with your palms facing forward.",
            "Keep your elbows close to your sides and curl the dumbbells toward your shoulders without swinging your body.",
            "Lower the dumbbells slowly and under control until your arms are fully extended."
        ],
        "hammer_curl": [
            "Stand tall with your feet shoulder-width apart and hold the dumbbells with your palms facing each other.",
            "Keep your elbows close to your sides and curl the dumbbells toward your shoulders without swinging your body.",
            "Lower the dumbbells slowly and under control until your arms are fully extended."
        ],
    }

    # Default sets/reps/rest
    sets, reps, rest = 3, 12, 60
    tempo = "2-0-2"
    form_tips = []

    # Weight-based adjustments
    if body["weight"] > 90:
        sets += 1
        reps -= 2
        rest += 15
        form_tips.append("Use controlled movements and avoid relying on momentum.")
    elif body["weight"] < 50:
        reps -= 2
        rest -= 10
        tempo = "3-1-3"
        form_tips.append("Use a slower tempo and prioritize stability throughout each repetition.")

    # Height-based adjustments
    if body["height"] > 190:
        tempo = "2-0-3"
        form_tips.append("Tall stature: pay extra attention to posture and range of motion.")
        if exercise.lower() == "bench press":
            form_tips.append("Keep shoulders retracted and elbows tucked to avoid shoulder strain.")
        if exercise.lower() == "lateral raises":
            form_tips.append("Avoid lifting arms too high to protect shoulder joints.")
    elif body["height"] < 160:
        form_tips.append("Short Stature: ensure full range of motion for maximum effectiveness.")

    # Age-based adjustments
    if body.get("age") and body["age"] >= 50:
        reps = max(8, reps - 2)
        rest += 15
        form_tips.append("- Older age: focus on slow, controlled movements and proper form.")
        form_tips.append("- Increase rest between sets to reduce fatigue and joint stress.")
    elif body.get("age") and body["age"] >= 35:
        rest += 10
        form_tips.append("Maintain good form and consider moderate weights.")

    # Equipment adjustments
    if equipment.lower() in ["bodyweight", "none"]:
        sets += 1
        reps += 3
        form_tips.append("Bodyweight exercises: increase reps slightly to maintain intensity.")

    # Instructions text
    instructions_text = f"Instructions for {exercise.replace("_", " ")}\n"
    for step in base_instructions.get(exercise, []):
        instructions_text += f"- {step}\n"

    instructions_text += (f"\nRecommended sets/reps/rest:\n" 
    f"- {sets} sets x {reps} reps\n"
    f"- {rest} sec rest\n"
    f"- Tempo: {tempo} (up-hold-down)\n")

    # Form & Technique tips
    if form_tips:
        instructions_text += "\nForm & Technique Tips:\n"
        for tip in form_tips:
            instructions_text += f"- {tip}\n"

    # Safety tips
    safety_tips = []

    if body["weight"] > 100:
        safety_tips.append("- Consider having a spotter for heavy lifts.")
    if body["weight"] < 45:
        safety_tips.append("Start with light weights and increase gradually.")
    if body.get("body_fat") and body["body_fat"] > 30:
        safety_tips.append("Focus on controlled movements to reduce joint strain.")
    if body.get("body_fat") and body["body_fat"] < 10:
        safety_tips.append("Ensure proper warm-up to avoid injury.")

    if safety_tips:
        instructions_text += "\nSafety Tips:\n"
        for tip in safety_tips:
            instructions_text += f"- {tip}\n"

    return instructions_text
