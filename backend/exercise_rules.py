def generate_rule_based_instructions(exercise, equipment, body):
    base_instructions = {
        "Lateral Raises": [
            "Stand straight, hold dumbbells at your sides.",
            "Raise arms to shoulder height without shrugging shoulders.",
            "Lower slowly back to sides."
        ],
        "Bench Press": [
            "Lie on bench, grip bar slightly wider than shoulders.",
            "Lower bar to chest slowly, keeping elbows at ~45° angle.",
            "Press bar up until arms are fully extended, keeping your back flat."
        ],
        "Bicep Curl": [
            "Stand upright, hold dumbbells with palms facing forward.",
            "Curl dumbbells toward shoulders without swinging your body.",
            "Lower slowly back to starting position."
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
        form_tips.append("- Heavier body: focus on controlled movements to protect joints.")
    elif body["weight"] < 50:
        reps -= 2
        rest -= 10
        tempo = "3-1-3"
        form_tips.append("- Lighter body: use slightly slower tempo to maintain stability.")

    # Height-based adjustments
    if body["height"] > 190:
        tempo = "2-0-3"
        form_tips.append("- Tall stature: pay extra attention to posture and range of motion.")
        if exercise.lower() == "bench press":
            form_tips.append("- Keep shoulders retracted and elbows tucked to avoid shoulder strain.")
        if exercise.lower() == "lateral raises":
            form_tips.append("- Avoid lifting arms too high to protect shoulder joints.")
    elif body["height"] < 160:
        form_tips.append("- Short stature: ensure full range of motion for maximum effectiveness.")

    # Age-based adjustments
    if body.get("age") and body["age"] >= 50:
        reps = max(8, reps - 2)
        rest += 15
        form_tips.append("- Older age: focus on slow, controlled movements and proper form.")
        form_tips.append("- Increase rest between sets to reduce fatigue and joint stress.")
    elif body.get("age") and body["age"] >= 35:
        rest += 10
        form_tips.append("- Mid-age: maintain good form and consider moderate weights.")

    # Equipment adjustments
    if equipment.lower() in ["bodyweight", "none"]:
        sets += 1
        reps += 3
        form_tips.append("- Bodyweight exercises: increase reps slightly to maintain intensity.")

    # Build instructions text
    instructions_text = f"**Instructions for {exercise}**\n"
    for step in base_instructions.get(exercise, []):
        instructions_text += f"- {step}\n"

    instructions_text += f"\n**Recommended sets/reps/rest:** {sets} sets of {reps} reps, {rest} sec rest\n"
    instructions_text += f"**Tempo:** {tempo} (up-hold-down)\n"

    # Form & Technique tips
    if form_tips:
        instructions_text += "\n**Form & Technique Tips:**\n"
        for tip in form_tips:
            instructions_text += f"- {tip}\n"

    # Safety tips
    safety_tips = []
    if body["weight"] > 100:
        safety_tips.append("- Consider having a spotter for heavy lifts.")
    if body["weight"] < 45:
        safety_tips.append("- Start with light weights and increase gradually.")
    if body.get("body_fat") and body["body_fat"] > 30:
        safety_tips.append("- Focus on controlled movements to reduce joint strain.")
    if body.get("body_fat") and body["body_fat"] < 10:
        safety_tips.append("- Ensure proper warm-up to avoid injury.")

    if safety_tips:
        instructions_text += "\n**Safety Tips:**\n"
        for tip in safety_tips:
            instructions_text += f"- {tip}\n"

    return instructions_text
