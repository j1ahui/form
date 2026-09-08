export const MP = {
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
    LEFT_ELBOW: 13,
    RIGHT_ELBOW: 14,
    LEFT_WRIST: 15,
    RIGHT_WRIST: 16,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
};

export function getArmKeypoints(isLeft) {
    return isLeft ? [MP.LEFT_SHOULDER, MP.LEFT_ELBOW, MP.LEFT_WRIST] : [MP.RIGHT_SHOULDER, MP.RIGHT_ELBOW, MP.RIGHT_WRIST];
  }

export function getArmConnections(isLeft) {      // visuals 
    return isLeft ? [[MP.LEFT_SHOULDER, MP.LEFT_ELBOW], [MP.LEFT_ELBOW, MP.LEFT_WRIST]] : [[MP.RIGHT_SHOULDER, MP.RIGHT_ELBOW], [MP.RIGHT_ELBOW, MP.RIGHT_WRIST]];
  }
  

// getArmConnections(true) returns
// [
//   [11, 13],  // shoulder → elbow
//   [13, 15]   // elbow → wrist
// ]