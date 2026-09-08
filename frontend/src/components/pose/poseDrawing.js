import { getArmConnections, getArmKeypoints } from "./landmarkUtils";

function drawResults(results, canvas, video, {
  sideRef, stageRef, repCountRef, rules, MP, angleBetween,
  setAngle, setRepCount, setFeedback,}) {
    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.save();                                       // draw mirrored video. save() saves current drawing settings (colours, font)
    ctx.scale(-1, 1);                                 // flipping horizontally 
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();                                    // restore setting saved by save() - everything would still be mirrored without it

    if (!results.landmarks || results.landmarks.length === 0) return;         // .length gives number of items in array. return = stop this function
    
    const lm = results.landmarks[0];          // results.landmarks = array containing detected poses. returns landmarks belonging to the first detected pose 
    const isLeft = sideRef.current === "left";
    const mx = x => (1 - x) * canvas.width;       // converts mediapipes normalized coordinates into canvas pixel coordinates 
    const py = y => y * canvas.height;


    const connections = getArmConnections(isLeft);      // arm skeleton
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 3;
    connections.forEach(([i, j]) => {                   // array destructuring. [i, j] = [11, 13] (a pair of landmarks)
      const a = lm[i];                                  // equivalent to: a = lm[11];
      const b = lm[j];                                  // b = lm[13]; 
      if (a.visibility > 0.4 && b.visibility > 0.4) {
        ctx.beginPath();                                // starts a new drawing path
        ctx.moveTo(mx(a.x), py(a.y));                   // moves drawing cursor to where you wanna start drawing
        ctx.lineTo(mx(b.x), py(b.y));                   // creates line to specified position
        ctx.stroke()                                    // draws path
      }
    });


    const armKps = getArmKeypoints(isLeft);       // [11, 13, 15]
    armKps.forEach(idx => {
      const kp = lm[idx];                         // if idx = 13, then kp = lm[13];
      if (kp.visibility > 0.3) {
        ctx.beginPath();
        ctx.arc(mx(kp.x), py(kp.y), 7, 0, 2 * Math.PI);
        ctx.fillStyle = "#3b82f6";
        ctx.strokeStyle = "#1d4ed8";
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
      }
    });

    // kp looks like (as const lm = results.landmarks[0];  and kp = lm[idx])
    // {
    //   x: 0.42,
    //   y: 0.53,
    //   visibility: 0.97
    // }

      // results = {
      //     image: ...,
      //     landmarks: [
      //         { x: 0.5, y: 0.1, visibility: 0.99 }, // 0 (nose)
      //         ...
      //         { x: 0.4, y: 0.3, visibility: 0.98 }, // 11 (left shoulder)
      //         { x: 0.6, y: 0.3, visibility: 0.97 }, // 12 (right shoulder)
      //         { x: 0.42, y: 0.45, visibility: 0.95 }, // 13 (left elbow)
      //         ...
      //     ]
      // };

    const measurement = rules.getAngle(lm, sideRef.current, MP, angleBetween);

    const landmarksVisible = measurement.points.every(point => point.visibility > 0.5);

    if (landmarksVisible) {
      const exerciseAngle = measurement.angle;

      setAngle(exerciseAngle);

      const result = rules.getNextStage(stageRef.current, exerciseAngle);

      stageRef.current = result.stage;

      if (result.repCompleted) {
        repCountRef.current += 1;
        setRepCount(repCountRef.current);
      }

      const fb = rules.getFeedback(exerciseAngle, result.stage);
      setFeedback(fb)

      armKps.forEach(idx => {
        const kp = lm[idx];
        if (kp.visibility > 0.3) {
          ctx.beginPath();
          ctx.arc(mx(kp.x), py(kp.y), 8, 0, 2 * Math.PI);
          ctx.fillStyle = fb.color;
          ctx.fill();
          
        }
      })
  
      // const ex = (1 - elbow.x) * canvas.width;        // x and y from results dict 
      // const ey = elbow.y * canvas.height;
      ctx.fillStyle = fb.color;
      ctx.font =  "bold 20px system-ui";
      ctx.fillText(`${exerciseAngle}`, mx(measurement.points[1].x) + 14, py(measurement.points[1].y) - 12);            // text above joint
    }
  }

export default drawResults;