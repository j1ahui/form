// ── Load MediaPipe from CDN ───────────────────────────────────────────────

    // useEffect(() => {
    //     const script1 = document.createElement("script");                                                       // creates a html element but in js. only loads mediapipe when component is used. document is a built-in object (represents and references html page that has been loaded)
    //     script1.src = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js";                   // <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"></script>
    //     script1.crossOrigin = "anonymous";                                                                      // tells browser its ok to load this script from another domain without sending user credentials 

    //     const script2 = document.createElement("script");
    //     script2.src = "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js";             // <script src="..."></script>
    //     script2.crossOrigin = "anonymous";

    //     const script3 = document.createElement("script");
    //     script3.src = "https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js";
    //     script3.crossOrigin = "anonymous";

    //     script3.onload = () => initPose();                              // assigning a function to onload property. onload and onerror are callback properties (giving browser functions to call when those events occur)
    //     script3.onerror = () => setStatus("error");

    //     document.body.appendChild(script1);                 // method that adds one html element as a child of another (take script (browser knows to download) and place it inside <body>)
    //     document.body.appendChild(script2);
    //     document.body.appendChild(script3);

    //     // const script = document.createElement("script");
    //     // script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.js";
    //     // script.crossOrigin = "anonymous";
    //     // script.onload = () => initPose();
    //     // script.onerror = () => setStatus("error");
    //     // document.body.appendChild(script);

    //     return () => {                                                      // function cleanup (used specially for useEffect()). cleanup removes extra memory, bugs, duplicate libs
    //         [script1, script2, script3].forEach(s => {
    //             if (document.body.contains(s)) document.body.removeChild(s);        // contains checks if script is actually inside body, if yes, run removechild()
    //         });
    //         if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    //         if (poseRef.current) poseRef.current.close?.();                             // only call close() if it exists (close() releases mediapipe resources)
    //     };

    // }, []);

    // drawingUtils.drawConnectors(mirrored, PoseLandmarker.POSE_CONNECTIONS, {      // draws lines connecting body joints
      //   color: "rgba(255,255,255,0.2)",
      //   lineWidth: 2,
      // });
      // drawingUtils.drawLandmarks(mirrored, {                                        // draws individual body points
      //   color: "#3b82f6",
      //   fillColor: "#1d4ed8",
      //   lineWidth: 1,
      //   radius: 4,
      // });


// const fb = rules.getFeedback(exerciseAngle, stageRef.current);
// setFeedback(fb);

        // ── Draw skeleton ──────────────────────────────────────────────────────
        
        // if (window.drawConnectors && window.POSE_CONNECTIONS) {             // checks for truthy properties ("if both properties are available, execute the code"). POSE_CONNECTIONS = an array of landmark pairs used by drawconnectors to know which joins to connect 
        //     const mirrored = lm.map(p => ({ ...p, x: 1 - p.x }));           // mirror landmarks for display. poseLandmarks keys value is a list with dict with keys x, y, visibility. 1 - p.x scales values 

        //     window.drawConnectors(ctx, mirrored, window.POSE_CONNECTIONS, {     // both a function and a property (value of property is a function). accessing a property's value (which is a function in this case)
        //         color: "rgba(255,255,255,0.2)",
        //         lineWidth: 2,
        //     });        

    // function processFrame(pose) {
    //     const loop = async () => {
    //         if (videoRef.current && videoRef.current.readyState === 4) {            // 4 means enough data to play the entire video (browser defined value)
    //             await pose.send({ image: videoRef.current });                       // { image: videoRef.current } = js object with property called image
    //         }
    //         animFrameRef.current = requestAnimationFrame(loop)                      // run same function before next refresh - designed for animations as it lets the browser schedule work
    //     };
    //     loop();         // function call
    // }

      // const shoulder = lm[isLeft ? MP.LEFT_SHOULDER : MP.RIGHT_SHOULDER];        // evaluates [MP.LEFT_SHOULDER] -> [11] then evaluates with lm lm[MP.LEFT_SHOULDER] (to index the lm array)
      // const elbow = lm[isLeft ? MP.LEFT_ELBOW : MP.RIGHT_ELBOW];
      // const wrist = lm[isLeft ? MP.LEFT_WRIST : MP.RIGHT_WRIST];
      // const hip = lm[isLeft ? MP.LEFT_HIP : MP.RIGHT_HIP];
