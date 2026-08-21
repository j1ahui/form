

const exerciseRules = {
    bicep_curl: {
        name: "Bicep Curl",
        angleType: "elbow",
        getFeedback(angle, stage) {
            if (angle > 160) { return { text: "Full extension - start curling up", color: "#22c55e" };} 
            if (angle < 50) { return { text: "Full curl - squeeze at the top, then lower slowly", color: "#22c55e" };}
            if (angle >= 60 && angle <= 100 && stage === "going_up") { return { text: "Curling through midpoint, keep driving up", color: "#3b82f6" };}
            if (angle >= 60 && angle <= 100 && stage === "going_down") { return { text: "Lowering through midpoint - control the descent", color: "#3b82f6" };}
            if (angle > 100 && stage === "going_down") { return { text: "Keep lowering for full range of motion", color: "#f59e0b" };}
            return { text: "Keep going!", color: "#9ca3af"}
        }
        
 
    },

    hammer_curl: {
        name: "Hammer Curl",
        angleType: "elbow",
        getFeedback(angle, stage) {
            if (angle > 160) { return { text: "Full extension - start curling up", color: "#22c55e" };} 
            if (angle < 50) { return { text: "Full curl - squeeze at the top, then lower slowly", color: "#22c55e" };}
            if (angle >= 60 && angle <= 100 && stage === "going_up") { return { text: "Curling through midpoint, keep driving up", color: "#3b82f6" };}
            if (angle >= 60 && angle <= 100 && stage === "going_down") { return { text: "Lowering through midpoint - control the descent", color: "#3b82f6" };}
            if (angle > 100 && stage === "going_down") { return { text: "Keep lowering for full range of motion", color: "#f59e0b" };}
            return { text: "Keep going!", color: "#9ca3af"}
        }
        
    },

    lateral_raises: {
        name: "Lateral Raises",
        angleType: "shoulder",

    },
    



};

export default exerciseRules;