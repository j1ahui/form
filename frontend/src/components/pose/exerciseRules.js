import STAGE from "./stages";

function getElbowAngle(lm, side, MP, angleBetween) {
    const shoulder = lm[side === "left" ? MP.LEFT_SHOULDER : MP.RIGHT_SHOULDER];
    const elbow = lm[side === "left" ? MP.LEFT_ELBOW : MP.RIGHT_ELBOW];
    const wrist = lm[side === "left" ? MP.LEFT_WRIST : MP.RIGHT_WRIST];

    return {
        angle: angleBetween(shoulder, elbow, wrist),
        points: [shoulder, elbow, wrist],
    }
}

function getShoulderAngle(lm, side, MP, angleBetween) {
    const hip = lm[side === "left" ? MP.LEFT_HIP : MP.RIGHT.HIP];
    const shoulder = lm[side === "left" ? MP.LEFT_SHOULDER : MP.RIGHT_SHOULDER];
    const elbow = lm[side === "left" ? MP.LEFT_ELBOW : MP.RIGHT_ELBOW];
    
    return {
        angle: angleBetween(hip, shoulder, elbow),
        points: [hip, shoulder, elbow],
    };
}


const exerciseRules = {
    bicep_curl: {
        name: "Bicep Curl",
        angleType: "elbow",
        getAngle(lm, side, MP, angleBetween) {
           return getElbowAngle(lm, side, MP, angleBetween) 
        },
        getNextStage(stage, angle) {
          if (stage === STAGE.WAITING && angle > 150) {stage = STAGE.GOING_UP;}
          if (stage === STAGE.GOING_UP && angle >= 60 && angle <= 100) {stage = STAGE.PASSED_MID_UP;}
          if (stage === STAGE.PASSED_MID_UP && angle < 50) {stage = STAGE.AT_TOP;}
          if (stage === STAGE.AT_TOP && angle >= 50) {stage = STAGE.GOING_DOWN;}
          if (stage === STAGE.GOING_DOWN && angle >= 60 && angle <= 100) {stage = STAGE.PASSED_MID_DOWN;}
          if (stage === STAGE.PASSED_MID_DOWN && angle > 150) {stage = STAGE.GOING_UP;}
          return stage;
        },
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
        getAngle(lm, side, MP, angleBetween) {
            return getElbowAngle(lm, side, MP, angleBetween)
        },
        getNextStage(stage, angle) {
            if (stage === STAGE.WAITING && angle > 150) {stage = STAGE.GOING_UP;}
            if (stage === STAGE.GOING_UP && angle >= 60 && angle <= 100) {stage = STAGE.PASSED_MID_UP;}
            if (stage === STAGE.PASSED_MID_UP && angle < 50) {stage = STAGE.AT_TOP;}
            if (stage === STAGE.AT_TOP && angle >= 50) {stage = STAGE.GOING_DOWN;}
            if (stage === STAGE.GOING_DOWN && angle >= 60 && angle <= 100) {stage = STAGE.PASSED_MID_DOWN;}
            if (stage === STAGE.PASSED_MID_DOWN && angle > 150) {stage = STAGE.GOING_UP;}
            
            return stage;
        },
        getFeedback(angle, stage) {
            if (angle > 160) { return { text: "Full extension - start curling up", color: "#22c55e" };} 
            if (angle < 50) { return { text: "Full curl - squeeze at the top, then lower slowly", color: "#22c55e" };}
            if (angle >= 60 && angle <= 100 && stage === "going_up") { return { text: "Curling through midpoint, keep driving up", color: "#3b82f6" };}
            if (angle >= 60 && angle <= 100 && stage === "going_down") { return { text: "Lowering through midpoint - control the descent", color: "#3b82f6" };}
            if (angle > 100 && stage === "going_down") { return { text: "Keep lowering for full range of motion", color: "#f59e0b" };}
            
            return { text: "Keep going!", color: "#9ca3af"};
        },
        
    },

    lateral_raises: {
        name: "Lateral Raises",
        angleType: "shoulder",
        getAngle(lm, side, MP, angleBetween) {
            return getShoulderAngle(lm, side, MP, angleBetween)
        },
        getNextStage(stage, angle) {
            if (stage === STAGE.WAITING && angle < 25) {stage = STAGE.GOING_UP;}
            if (stage === STAGE.GOING_UP && angle >= 45 && angle <= 70) {stage = STAGE.PASSED_MID_UP;}
            if (stage === STAGE.PASSED_MID_UP && angle >= 75) {stage = STAGE.AT_TOP;}
            if (stage === STAGE.AT_TOP && angle < 75) {stage = STAGE.GOING_DOWN;}
            if (stage === STAGE.GOING_DOWN && angle >=45 && angle <= 70) {stage = STAGE.PASSED_MID_DOWN;}
            if (stage === STAGE.PASSED_MID_DOWN && angle < 25) {stage = STAGE.GOING_UP;} 
            
            return stage;
        },
        getFeedback(angle, stage) {
            if (angle < 25) { return { text: "Arms down - start raising", color: "#22c55e"};}
            if (angle >= 75) { return { text: "Arms at shoulder height - lower slowly", color: "#22c55e"};}
            if (angle >= 45 && stage === "going_up") { return { text: "Keep raising - control the movement", color: "#22c55e"};}
            if (angle >= 45 && stage === "going_down") { return { text: "Lower slowly and stay controlled", color: "#22c55e"};}
            return {text: "Keep goingg!", color: "#22c55e"};
        },

    },
    



};

export default exerciseRules;