// real time bicep curl form analysis using MediaPipe Pose (lib from google - uses ml to detect human body from an image/video) via CDN (content delivery network - instead of installing mediapipe, you load directly from internet)
// calcs elbow angle, counts reps, gives live feedback 

import { useEffect, useRef, useState, useCallback } from "react";
import { PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";    // PoseLandmarker detects human body landmarks using ML. filesetresolver class helps load wasm (webassembly) files that mp needs to run in browser

import exerciseRules from "./pose/exerciseRules";

// joint indices from MediaPipe Pose 
// https://developers.google.com/mediapipe/solutions/vision/pose_landmarker

const MP = {
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
    LEFT_ELBOW: 13,
    RIGHT_ELBOW: 14,
    LEFT_WRIST: 15,
    RIGHT_WRIST: 16,
};


function getArmConnections(isLeft) {
  return isLeft ? [[MP.LEFT_SHOULDER, MP.LEFT_ELBOW], [MP.LEFT_ELBOW, MP.LEFT_WRIST]] : [[MP.RIGHT_SHOULDER, MP.RIGHT_ELBOW], [MP.RIGHT_ELBOW, MP.RIGHT_WRIST]];
}


function getArmKeypoints(isLeft) {
  return isLeft ? [MP.LEFT_SHOULDER, MP.LEFT_ELBOW, MP.LEFT_WRIST] : [MP.RIGHT_SHOULDER, MP.RIGHT_ELBOW, MP.RIGHT_WRIST];
}


function angleBetween(a, b, c) {
    // angle at point B formed by A-B-C
    const radians = 
        Math.atan2(c.y - b.y, c.x - b.x) -              // which direction is point c from b
        Math.atan2(a.y - b.y, a.x - b.x);               // which direction is a from b
    let angle = Math.abs((radians * 180) / Math.PI);
    if (angle > 180) angle = 360 - angle;               // elbow bend (0º - 180º)
    return Math.round(angle);
}

// function getFeedback(angle, stage) {
//     if (angle > 160) { return { text: "Full extension - start curling up", color: "#22c55e" };} 
//     if (angle < 50) { return { text: "Full curl - squeeze at the top, then lower slowly", color: "#22c55e" };}
//     if (angle >= 60 && angle <= 100 && stage === "going_up") { return { text: "Curling through midpoint, keep driving up", color: "#3b82f6" };}
//     if (angle >= 60 && angle <= 100 && stage === "going_down") { return { text: "Lowering through midpoint - control the descent", color: "#3b82f6" };}
//     if (angle > 100 && stage === "going_down") { return { text: "Keep lowering for full range of motion", color: "#f59e0b" };}
//     return { text: "Keep going!", color: "#9ca3af"}
// }


// ── Rep state machine ────────────────────────────────────────────────────────
// Valid rep = extension → midpoint up → full curl → midpoint down → extension

const STAGE = {
  WAITING: "waiting",
  GOING_UP: "going_up",
  PASSED_MID_UP: "passed_mid_up",
  AT_TOP: "at_top",
  GOING_DOWN: "going_down",
  PASSED_MID_DOWN: "passed_mid_down",
}


export default function PoseDetection({ exercise, onClose }) {
    const rules = exerciseRules[exercise]
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const landmarkerRef = useRef(null);
    // const poseRef = useRef(null);
    const animFrameRef = useRef(null);
    const lastVideoTime = useRef(-1);               // video.currentTime starts at 0 seconds (or another non-negative), essentially saying no video frames have been processed

    const stageRef = useRef(STAGE.WAITING);
    const repCountRef = useRef(0);

    const [status, setStatus] = useState("Loading");
    const [angle, setAngle] = useState(null);
    const [feedback, setFeedback] = useState({ text: "Starting camera...", color: "#9ca3af" });
    const [repCount, setRepCount] = useState(0)
    const [side, setSide] = useState("left");
    const sideRef = useRef("left")
    sideRef.current = side;

    // ── Init PoseLandmarker ──────────────────────────────────────────────────
    useEffect(() => {
      let cancelled = false;          // used to stop the async func from continuing after the react component has unmounted

      async function init() {
        try {
          const vision = await FilesetResolver.forVisionTasks(                      // forVisionTasks is a method of FilesetResolver class. creating vision object
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
          );

          const landmarker = await PoseLandmarker.createFromOptions(vision, {       // vision passed as result from result of FilesetResolver. second object/dict is a configuration object telling PoseLandmarker how you want the pose detector to be created  
            baseOptions: {                                                          // contains setting about underlying ml model
              modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
              delegate: "GPU"
            },
            runningMode: "VIDEO",
            numPoses: 1,
            minPoseDetectionConfidence: 0.6,
            minPosePresenceConfidence: 0.6,
            minTrackingConfidence: 0.5,
          });

          if (cancelled) { landmarker.close(); return; }

          landmarkerRef.current = landmarker;
          startCamera();

        } catch (err) {
          console.error("MediaPipe init error:", err);
          if (!cancelled) setStatus("error");
        }
      }

      init();

      return () => {            // function clean up 
        cancelled = true;
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);       // no {} as its only one if statement
        if (landmarkerRef.current) landmarkerRef.current.close();

        if (videoRef.current?.srcObject) {                                          // srcObject is a property of <video> element
          videoRef.current.srcObject.getTracks().forEach(t => t.stop());            // MediaStream can contain one or more MediaStreamTrack objects (video track through camera, audio track through mic). getTracks() returns those tracks as an array
        }
      };
    }, []);

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

    // function initPose() {
    //     if (!window.Pose) {setStatus("error"); return; }

    //     const pose = new window.Pose({                                          // from https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js. creates a Pose object. attached to window as it was loaded from a <script> tag instead of imported (came from global browser environment)
    //         locateFile: (file) =>                                               // callback func
    //             `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,         // mediapipe stores this func and calls it whenever it needs to find a pose inits internal files
    //     });

    //     pose.setOptions({                               // configures how mediapipe pose model behaves 
    //         modelComplexity: 1,                         // balanced model                                
    //         smoothLandmarks: true,                      // applies smoothing to reduce noise 
    //         enableSegmentation: false,                  // mediapipe predicts which pixels belong to the person (app only uses body anyways)
    //         minDetectionConfidence: 0.6,                // detections below 60% confidence are discarded
    //         minTrackingConfidence: 0.5,                 // after detecting, mediapipe starts tracking - option controls how confident the tracker must be to continue tracking 

    //     });

    //     pose.onResults(onResults);
    //     poseRef.current = pose;
    //     startCamera(pose);

    // }

    function startCamera() {
        navigator.mediaDevices                          // browser provided object that gives js access to users camera and mic (a part of web api)
            .getUserMedia({ video: { width: 640, height: 480 } })
            .then((stream) => {                         // stream receives the camera stream
                videoRef.current.srcObject = stream;    // allows you to attach a live stream
                videoRef.current.onloadeddata = () => {   // assigning func to onloadeddata property of <video> element (when the videos loadeddata event occurs, run this func) 
                  
                  videoRef.current.play();
                  setStatus("running");
                  requestAnimationFrame(processFrame);

                };
            })
            .catch(() => setStatus("error"));
    }

    function processFrame() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;

      if (!video || !canvas || !landmarker || video.readyState < 2) {       // readyState = property of <video> element (tells you how much video data has been loaded and is available). 2 = current video frame availability
        animFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      const now = performance.now();                              // performance is also provided by browsers web api like document, window, navigator. now() returns a timestamp repping how many milliseconds have elapsed since page has started (detectForVideo expects a timestamp for video frame being processed)
      if (video.currentTime !== lastVideoTime.current) {                  // currentTime is a property of html <video>. REMEMBER THAT . ALLOWS ACCESS TO A PROPERTY!!!!!!!!!
        lastVideoTime.current = video.currentTime;

        const results = landmarker.detectForVideo(video, now);    // using object here 
        drawResults(results, canvas, video);
      }

      // video.currentTime      -> properties/methods of <video> element
      // video.readyState
      // video.play()
      // video.videoWidth

      animFrameRef.current = requestAnimationFrame(processFrame);
    }


    // ── Draw + analyze ───────────────────────────────────────────────────────

    function drawResults(results, canvas, video) {
      const ctx = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();

      if (!results.landmarks || results.landmarks.length === 0) return;         // .length gives number of items in array. return = stop this function
      
      const lm = results.landmarks[0];          // results.landmarks = array containing detected poses. returns landmarks belonging to the first detected pose 
      const isLeft = sideRef.current === "left";
      const mx = x => (1 - x) * canvas.width;       // converts mediapipes normalized coordinates into canvas pixel coordinates 
      const py = y => y * canvas.height;

      // ── Arm-only skeleton ─────────────────────────────────────────────────

      const connections = getArmConnections(isLeft);
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

      // ── Arm keypoints ─────────────────────────────────────────────────────

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

      // getArmConnections(true) returns
      // [
      //   [11, 13],  // shoulder → elbow
      //   [13, 15]   // elbow → wrist
      // ]

      // const drawingUtils = new DrawingUtils(ctx);
      // const mirrored = lm.map(p => ({...p, x: 1 - p.x}));

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


      // ── Calculate elbow angle ──────────────────────────────────────────────

      const shoulder = lm[isLeft ? MP.LEFT_SHOULDER : MP.RIGHT_SHOULDER];        // evaluates [MP.LEFT_SHOULDER] -> [11] then evaluates with lm lm[MP.LEFT_SHOULDER] (to index the lm array)
      const elbow = lm[isLeft ? MP.LEFT_ELBOW : MP.RIGHT_ELBOW];
      const wrist = lm[isLeft ? MP.LEFT_WRIST : MP.RIGHT_WRIST];

      // landmark object:
      // {
      //     x: 0.42,
      //     y: 0.61,
      //     z: -0.12,
      //     visibility: 0.96
      // }

      if (shoulder.visibility > 0.5 && elbow.visibility > 0.5 && wrist.visibility > 0.5) {
          const elbowAngle = angleBetween(shoulder, elbow, wrist);
          setAngle(elbowAngle);

          // ── Rep counting ─────────────────────────────────────────────────────

          let stage = stageRef.current;

          if (stage === STAGE.WAITING && elbowAngle > 150) {                  // dict/object property access
            stage = STAGE.GOING_UP;
          }

          if (stage === STAGE.GOING_UP && elbowAngle >= 60 && elbowAngle <= 100) {
            stage = STAGE.PASSED_MID_UP;
          }

          if (stage === STAGE.PASSED_MID_UP && elbowAngle < 50) {
            stage = STAGE.AT_TOP;
          }

          if (stage === STAGE.AT_TOP && elbowAngle >= 50) {
            stage = STAGE.GOING_DOWN;
          }

          if (stage === STAGE.GOING_DOWN && elbowAngle >= 60 && elbowAngle <= 100) {
            stage = STAGE.PASSED_MID_DOWN;
          }

          if (stage === STAGE.PASSED_MID_DOWN && elbowAngle > 150) {
            repCountRef.current += 1;
            setRepCount(repCountRef.current);
            stage = STAGE.GOING_UP;

          }

          stageRef.current = stage;



          // ── Feedback ─────────────────────────────────────────────────────

          // const fb = getFeedback(elbowAngle, stageRef.current);
          // setFeedback(fb);

          const fb = rules.getFeedback(elbowAngle, stageRef.current);
          setFeedback(fb);

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
          ctx.fillText(`${elbowAngle}`, mx(elbow.x) + 14, py(elbow.y) - 12);            // text above joint

    }

    // function processFrame(pose) {
    //     const loop = async () => {
    //         if (videoRef.current && videoRef.current.readyState === 4) {            // 4 means enough data to play the entire video (browser defined value)
    //             await pose.send({ image: videoRef.current });                       // { image: videoRef.current } = js object with property called image
    //         }
    //         animFrameRef.current = requestAnimationFrame(loop)                      // run same function before next refresh - designed for animations as it lets the browser schedule work
    //     };
    //     loop();         // function call
    // }

    // const onResults = useCallback((results) => {                // creating a function and storing it in onResults variable (usecallback returns a function)
    //     const canvas = canvasRef.current;
    //     if (!canvas) return;
    //     const ctx = canvas.getContext("2d");
    //     canvas.width = results.image.width;
    //     canvas.height = results.image.height;

    //     ctx.save();                                 // draw mirrored video. save() saves current drawing settings (colours, font)
    //     ctx.scale(-1, 1);                           // flipping horizontally 
    //     ctx.drawImage(results.image, -canvas.width, 0, canvas.width, canvas.height);
    //     ctx.restore();                              // restore setting saved by save() - everything would still be mirrored without it

    //     if (!results.poseLandmarks) return;         // results is a js object(dict) returned by mediapipe 
    //     const lm = results.poseLandmarks;           // dict access 


        // ── Draw skeleton ──────────────────────────────────────────────────────
        
        // if (window.drawConnectors && window.POSE_CONNECTIONS) {             // checks for truthy properties ("if both properties are available, execute the code"). POSE_CONNECTIONS = an array of landmark pairs used by drawconnectors to know which joins to connect 
        //     const mirrored = lm.map(p => ({ ...p, x: 1 - p.x }));           // mirror landmarks for display. poseLandmarks keys value is a list with dict with keys x, y, visibility. 1 - p.x scales values 

        //     window.drawConnectors(ctx, mirrored, window.POSE_CONNECTIONS, {     // both a function and a property (value of property is a function). accessing a property's value (which is a function in this case)
        //         color: "rgba(255,255,255,0.2)",
        //         lineWidth: 2,
        //     });        
    }

    function resetReps() {
        repCountRef.current = 0;
        setRepCount(0);
        stageRef.current = STAGE.WAITING;
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
    
          {/* Header */}
          <div className="w-full max-w-2xl flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-semibold text-lg">{rules.name}</h2>
              <p className="text-gray-500 text-xs mt-0.5">MediaPipe · real-time joint tracking</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-sm px-3 py-1.5 border border-white/10 rounded-lg"
            >
              Close
            </button>
          </div>
    
          {/* Camera feed */}
          <div 
            className="relative w-full max-w-2xl rounded-xl overflow-hidden bg-[#111]"
            style={{ minHeight: "300px" }}
          >
            <video ref={videoRef} className="hidden" playsInline muted />                       {/* ref attribute connects videoRef to <video> DOM (document object model - browsers js representation of the html page. e.g if you write <video ref={videoRef} />, browser creates corresponding DOM element repping that <video> element, allowing js to interact with that element like video.readyState.   */}
            <canvas ref={canvasRef} className="w-full rounded-xl" />
    
            {status === "loading" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-gray-400 text-sm">Loading MediaPipe Full model...</p>
              </div>
            )}
            {status === "error" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-red-400 text-sm">Camera access denied or MediaPipe failed to load.</p>
              </div>
            )}
          </div>
    
          {/* Stats row */}
          <div className="w-full max-w-2xl grid grid-cols-3 gap-3 mt-4">
    
            {/* Elbow angle */}
            <div className="bg-[#1a1a1a] rounded-xl p-4 text-center">
              <p className="text-gray-500 text-xs mb-1">Elbow Angle</p>
              <p className="text-white text-3xl font-bold">
                {angle !== null ? `${angle}°` : "—"}
              </p>
            </div>
    
            {/* Rep count */}
            <div className="bg-[#1a1a1a] rounded-xl p-4 text-center">
              <p className="text-gray-500 text-xs mb-1">Reps</p>
              <p className="text-white text-3xl font-bold">{repCount}</p>
              <button
                onClick={resetReps}
                className="text-gray-600 hover:text-gray-400 text-xs mt-1"
              >
                reset
              </button>
            </div>
    
            {/* Side selector */}
            <div className="bg-[#1a1a1a] rounded-xl p-4 text-center">
              <p className="text-gray-500 text-xs mb-2">Tracking</p>
              <div className="flex gap-2 justify-center">
                {["left", "right"].map(s => (
                  <button
                    key={s}
                    onClick={() => setSide(s)}
                    className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                      side === s
                        ? "bg-blue-500 text-white"
                        : "bg-[#2a2a2a] text-gray-400 hover:text-white"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
    
          {/* Feedback bar */}
          <div
            className="w-full max-w-2xl mt-3 rounded-xl p-4 text-center transition-colors"
            style={{ backgroundColor: `${feedback.color}18`, border: `1px solid ${feedback.color}30` }}
          >
            <p className="font-medium text-sm" style={{ color: feedback.color }}>
              {feedback.text}
            </p>
          </div>
    
        </div>
      );

}



