// real time bicep curl form analysis using MediaPipe Pose (lib from google - uses ml to detect human body from an image/video) via CDN (content delivery network - instead of installing mediapipe, you load directly from internet)

import { useEffect, useRef, useState, useCallback } from "react";

import exerciseRules from "./pose/exerciseRules";
import STAGE from "./pose/stages";
import angleBetween from "./pose/angleUtils";
import { MP, getArmKeypoints } from "./pose/landmarkUtils";
import usePoseLandmarker from "./pose/usePoseLandmarker";

// joint indices from MediaPipe Pose - https://developers.google.com/mediapipe/solutions/vision/pose_landmarker

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



