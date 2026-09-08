// real time bicep curl form analysis using MediaPipe Pose (lib from google - uses ml to detect human body from an image/video) via CDN (content delivery network - instead of installing mediapipe, you load directly from internet)

import { useEffect, useRef, useState, useCallback } from "react";
// import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";    // PoseLandmarker detects human body landmarks using ML. filesetresolver class helps load wasm (webassembly) files that mp needs to run in browser

import exerciseRules from "./pose/exerciseRules";
import STAGE from "./pose/stages";
import angleBetween from "./pose/angleUtils";
import { MP, getArmKeypoints } from "./pose/landmarkUtils";
import usePoseLandmarker from "./pose/usePoseLandmarker";

// joint indices from MediaPipe Pose - https://developers.google.com/mediapipe/solutions/vision/pose_landmarker

// export function getArmConnections(isLeft) {      // visuals 
//   return isLeft ? [[MP.LEFT_SHOULDER, MP.LEFT_ELBOW], [MP.LEFT_ELBOW, MP.LEFT_WRIST]] : [[MP.RIGHT_SHOULDER, MP.RIGHT_ELBOW], [MP.RIGHT_ELBOW, MP.RIGHT_WRIST]];
// }

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

    
    usePoseLandmarker({videoRef, canvasRef, landmarkerRef, animFrameRef, lastVideoTime, setStatus, sideRef, stageRef, repCountRef, rules, MP, angleBetween, setAngle, setRepCount, setFeedback});


    // useEffect(() => {                 // initialising PoseLandmarker
    //   let cancelled = false;          // used to stop the async func from continuing after the react component has unmounted

    //   async function init() {
    //     try {
    //       const vision = await FilesetResolver.forVisionTasks(                      // forVisionTasks is a method of FilesetResolver class. creating vision object
    //         "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    //       );

    //       const landmarker = await PoseLandmarker.createFromOptions(vision, {       // vision passed as result from result of FilesetResolver. second object/dict is a configuration object telling PoseLandmarker how you want the pose detector to be created  
    //         baseOptions: {                                                          // contains setting about underlying ml model
    //           modelAssetPath:
    //           "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
    //           delegate: "GPU"
    //         },
    //         runningMode: "VIDEO",
    //         numPoses: 1,
    //         minPoseDetectionConfidence: 0.6,
    //         minPosePresenceConfidence: 0.6,
    //         minTrackingConfidence: 0.5,
    //       });

    //       if (cancelled) { landmarker.close(); return; }

    //       landmarkerRef.current = landmarker;
    //       startCamera();

    //     } catch (err) {
    //       console.error("MediaPipe init error:", err);
    //       if (!cancelled) setStatus("error");
    //     }
    //   }

    //   init();

    //   return () => {            // function clean up 
    //     cancelled = true;
    //     if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);       // no {} as its only one if statement
    //     if (landmarkerRef.current) landmarkerRef.current.close();

    //     if (videoRef.current?.srcObject) {                                          // srcObject is a property of <video> element
    //       videoRef.current.srcObject.getTracks().forEach(t => t.stop());            // MediaStream can contain one or more MediaStreamTrack objects (video track through camera, audio track through mic). getTracks() returns those tracks as an array
    //     }
    //   };
    // }, []);

  
    // function startCamera() {
    //     navigator.mediaDevices                          // browser provided object that gives js access to users camera and mic (a part of web api)
    //         .getUserMedia({ video: { width: 640, height: 480 } })
    //         .then((stream) => {                         // stream receives the camera stream
    //             videoRef.current.srcObject = stream;    // allows you to attach a live stream
    //             videoRef.current.onloadeddata = () => {   // assigning func to onloadeddata property of <video> element (when the videos loadeddata event occurs, run this func) 
                  
    //               videoRef.current.play();
    //               setStatus("running");
    //               requestAnimationFrame(processFrame);

    //             };
    //         })
    //         .catch(() => setStatus("error"));
    // }

    // function processFrame() {
    //   const video = videoRef.current;
    //   const canvas = canvasRef.current;
    //   const landmarker = landmarkerRef.current;

    //   if (!video || !canvas || !landmarker || video.readyState < 2) {       // readyState = property of <video> element (tells you how much video data has been loaded and is available). 2 = current video frame availability
    //     animFrameRef.current = requestAnimationFrame(processFrame);
    //     return;
    //   }

    //   const now = performance.now();                              // performance is also provided by browsers web api like document, window, navigator. now() returns a timestamp repping how many milliseconds have elapsed since page has started (detectForVideo expects a timestamp for video frame being processed)
    //   if (video.currentTime !== lastVideoTime.current) {                  // currentTime is a property of html <video>. REMEMBER THAT . ALLOWS ACCESS TO A PROPERTY!!!!!!!!!
    //     lastVideoTime.current = video.currentTime;

    //     const results = landmarker.detectForVideo(video, now);    // using object here 
    //     drawResults(results, canvas, video);
    //   }

    //   // video.currentTime      -> properties/methods of <video> element
    //   // video.readyState
    //   // video.play()
    //   // video.videoWidth

    //   animFrameRef.current = requestAnimationFrame(processFrame);
    // }

    
    // function drawResults(results, canvas, video) {
    //   const ctx = canvas.getContext("2d");
    //   canvas.width = video.videoWidth;
    //   canvas.height = video.videoHeight;

    //   ctx.save();                                       // draw mirrored video. save() saves current drawing settings (colours, font)
    //   ctx.scale(-1, 1);                                 // flipping horizontally 
    //   ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    //   ctx.restore();                                    // restore setting saved by save() - everything would still be mirrored without it

    //   if (!results.landmarks || results.landmarks.length === 0) return;         // .length gives number of items in array. return = stop this function
      
    //   const lm = results.landmarks[0];          // results.landmarks = array containing detected poses. returns landmarks belonging to the first detected pose 
    //   const isLeft = sideRef.current === "left";
    //   const mx = x => (1 - x) * canvas.width;       // converts mediapipes normalized coordinates into canvas pixel coordinates 
    //   const py = y => y * canvas.height;


    //   const connections = getArmConnections(isLeft);      // arm skeleton
    //   ctx.strokeStyle = "rgba(255,255,255,0.4)";
    //   ctx.lineWidth = 3;
    //   connections.forEach(([i, j]) => {                   // array destructuring. [i, j] = [11, 13] (a pair of landmarks)
    //     const a = lm[i];                                  // equivalent to: a = lm[11];
    //     const b = lm[j];                                  // b = lm[13]; 
    //     if (a.visibility > 0.4 && b.visibility > 0.4) {
    //       ctx.beginPath();                                // starts a new drawing path
    //       ctx.moveTo(mx(a.x), py(a.y));                   // moves drawing cursor to where you wanna start drawing
    //       ctx.lineTo(mx(b.x), py(b.y));                   // creates line to specified position
    //       ctx.stroke()                                    // draws path
    //     }
    //   });


    //   const armKps = getArmKeypoints(isLeft);       // [11, 13, 15]
    //   armKps.forEach(idx => {
    //     const kp = lm[idx];                         // if idx = 13, then kp = lm[13];
    //     if (kp.visibility > 0.3) {
    //       ctx.beginPath();
    //       ctx.arc(mx(kp.x), py(kp.y), 7, 0, 2 * Math.PI);
    //       ctx.fillStyle = "#3b82f6";
    //       ctx.strokeStyle = "#1d4ed8";
    //       ctx.lineWidth = 2;
    //       ctx.fill();
    //       ctx.stroke();
    //     }
    //   });

    // //   // kp looks like (as const lm = results.landmarks[0];  and kp = lm[idx])
    // //   // {
    // //   //   x: 0.42,
    // //   //   y: 0.53,
    // //   //   visibility: 0.97
    // //   // }

    // //     // results = {
    // //     //     image: ...,
    // //     //     landmarks: [
    // //     //         { x: 0.5, y: 0.1, visibility: 0.99 }, // 0 (nose)
    // //     //         ...
    // //     //         { x: 0.4, y: 0.3, visibility: 0.98 }, // 11 (left shoulder)
    // //     //         { x: 0.6, y: 0.3, visibility: 0.97 }, // 12 (right shoulder)
    // //     //         { x: 0.42, y: 0.45, visibility: 0.95 }, // 13 (left elbow)
    // //     //         ...
    // //     //     ]
    // //     // };

    //   const measurement = rules.getAngle(lm, sideRef.current, MP, angleBetween);

    //   const landmarksVisible = measurement.points.every(point => point.visibility > 0.5);

    //   if (landmarksVisible) {
    //     const exerciseAngle = measurement.angle;

    //     setAngle(exerciseAngle);

    //     const result = rules.getNextStage(stageRef.current, exerciseAngle);

    //     stageRef.current = result.stage;

    //     if (result.repCompleted) {
    //       repCountRef.current += 1;
    //       setRepCount(repCountRef.current);
    //     }

    //     const fb = rules.getFeedback(exerciseAngle, result.stage);
    //     setFeedback(fb)

    //     armKps.forEach(idx => {
    //       const kp = lm[idx];
    //       if (kp.visibility > 0.3) {
    //         ctx.beginPath();
    //         ctx.arc(mx(kp.x), py(kp.y), 8, 0, 2 * Math.PI);
    //         ctx.fillStyle = fb.color;
    //         ctx.fill();
            
    //       }
    //     })
    
    //     // const ex = (1 - elbow.x) * canvas.width;        // x and y from results dict 
    //     // const ey = elbow.y * canvas.height;
    //     ctx.fillStyle = fb.color;
    //     ctx.font =  "bold 20px system-ui";
    //     ctx.fillText(`${exerciseAngle}`, mx(measurement.points[1].x) + 14, py(measurement.points[1].y) - 12);            // text above joint
    //   }
    // }

    // // landmark object (list of dicts in results dict):
    // // {
    // //     x: 0.42,
    // //     y: 0.61,
    // //     z: -0.12,
    // //     visibility: 0.96
    // // }

    function resetReps() {
        repCountRef.current = 0;
        setRepCount(0);
        stageRef.current = STAGE.WAITING;
    }

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
    
            {/* Angle */}
            <div className="bg-[#1a1a1a] rounded-xl p-4 text-center">
              <p className="text-gray-500 text-xs mb-1">{rules.angleType === "shoulder" ? "Shoulder Angle" : "Elbow Angle"}</p>
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



