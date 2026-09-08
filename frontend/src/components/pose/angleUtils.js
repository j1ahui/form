export function angleBetween(a, b, c) {
    // angle at point B formed by A-B-C
    const radians = 
        Math.atan2(c.y - b.y, c.x - b.x) -              // which direction is point c from b
        Math.atan2(a.y - b.y, a.x - b.x);               // which direction is a from b

    let angle = Math.abs((radians * 180) / Math.PI);

    if (angle > 180) angle = 360 - angle;               // elbow bend (0º - 180º)

    return Math.round(angle);
}

export default angleBetween;
