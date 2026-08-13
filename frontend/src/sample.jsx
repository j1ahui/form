// src/components/PoseDetection.jsx
// Real-time bicep curl form analysis using MediaPipe Pose via CDN
// Calculates elbow angle, counts reps, gives live feedback

import { useEffect, useRef, useState, useCallback } from "react";

// Joint indices from MediaPipe Pose
// https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
const MP = {
  LEFT_SHOULDER:  11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW:     13,
  RIGHT_ELBOW:    14,
  LEFT_WRIST:     15,
  RIGHT_WRIST:    16,
};

function angleBetween(a, b, c) {
  // Angle at point B formed by A-B-C
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) -
    Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return Math.round(angle);
}

function getFeedback(angle, stage) {
  if (angle > 160) {
    return { text: "Full extension — good start position", color: "#22c55e" };
  } else if (angle < 40) {
    return { text: "Full curl — squeeze at the top!", color: "#22c55e" };
  } else if (angle < 90 && stage === "down") {
    return { text: "Curl up — drive that elbow", color: "#3b82f6" };
  } else if (angle > 90 && stage === "up") {
    return { text: "Lower slowly — control the descent", color: "#3b82f6" };
  } else if (angle > 120) {
    return { text: "Keep lowering for full range", color: "#f59e0b" };
  }
  return { text: "Keep going...", color: "#9ca3af" };
}

export default function PoseDetection({ onClose }) {
  const videoRef     = useRef(null);
  const canvasRef    = useRef(null);
  const poseRef      = useRef(null);
  const animFrameRef = useRef(null);
  const stageRef     = useRef("down");   // "up" | "down"
  const repCountRef  = useRef(0);

  const [status,    setStatus]    = useState("loading");  // loading | ready | running | error
  const [angle,     setAngle]     = useState(null);
  const [feedback,  setFeedback]  = useState({ text: "Starting camera...", color: "#9ca3af" });
  const [repCount,  setRepCount]  = useState(0);
  const [side,      setSide]      = useState("left");     // which arm to track

  // ── Load MediaPipe from CDN ───────────────────────────────────────────────
  useEffect(() => {
    const script1 = document.createElement("script");
    script1.src = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js";
    script1.crossOrigin = "anonymous";

    const script2 = document.createElement("script");
    script2.src = "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js";
    script2.crossOrigin = "anonymous";

    const script3 = document.createElement("script");
    script3.src = "https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js";
    script3.crossOrigin = "anonymous";

    script3.onload = () => initPose();
    script3.onerror = () => setStatus("error");

    document.body.appendChild(script1);
    document.body.appendChild(script2);
    document.body.appendChild(script3);

    return () => {
      [script1, script2, script3].forEach(s => {
        if (document.body.contains(s)) document.body.removeChild(s);
      });
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (poseRef.current) poseRef.current.close?.();
    };
  }, []);

  function initPose() {
    if (!window.Pose) { setStatus("error"); return; }

    const pose = new window.Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5,
    });

    pose.onResults(onResults);
    poseRef.current = pose;
    startCamera(pose);
  }

  function startCamera(pose) {
    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480 } })
      .then((stream) => {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStatus("running");
        processFrame(pose);
      })
      .catch(() => setStatus("error"));
  }

  function processFrame(pose) {
    const loop = async () => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        await pose.send({ image: videoRef.current });
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };
    loop();
  }

  const onResults = useCallback((results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width  = results.image.width;
    canvas.height = results.image.height;

    // Draw mirrored video
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(results.image, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    if (!results.poseLandmarks) return;
    const lm = results.poseLandmarks;

    // ── Draw skeleton ──────────────────────────────────────────────────────
    if (window.drawConnectors && window.POSE_CONNECTIONS) {
      // Mirror landmarks for display
      const mirrored = lm.map(p => ({ ...p, x: 1 - p.x }));

      window.drawConnectors(ctx, mirrored, window.POSE_CONNECTIONS, {
        color: "rgba(255,255,255,0.2)",
        lineWidth: 2,
      });
      window.drawLandmarks(ctx, mirrored, {
        color: "#3b82f6",
        fillColor: "#1d4ed8",
        lineWidth: 1,
        radius: 4,
      });
    }

    // ── Calculate elbow angle ──────────────────────────────────────────────
    const shoulder = side === "left" ? lm[MP.LEFT_SHOULDER]  : lm[MP.RIGHT_SHOULDER];
    const elbow    = side === "left" ? lm[MP.LEFT_ELBOW]     : lm[MP.RIGHT_ELBOW];
    const wrist    = side === "left" ? lm[MP.LEFT_WRIST]     : lm[MP.RIGHT_WRIST];

    if (shoulder.visibility > 0.5 && elbow.visibility > 0.5 && wrist.visibility > 0.5) {
      const elbowAngle = angleBetween(shoulder, elbow, wrist);
      setAngle(elbowAngle);

      // ── Rep counting ─────────────────────────────────────────────────────
      if (elbowAngle > 150 && stageRef.current === "up") {
        stageRef.current = "down";
      }
      if (elbowAngle < 45 && stageRef.current === "down") {
        stageRef.current = "up";
        repCountRef.current += 1;
        setRepCount(repCountRef.current);
      }

      // ── Live feedback ─────────────────────────────────────────────────────
      const fb = getFeedback(elbowAngle, stageRef.current);
      setFeedback(fb);

      // ── Draw angle on canvas ──────────────────────────────────────────────
      const ex = (1 - elbow.x) * canvas.width;
      const ey = elbow.y * canvas.height;
      ctx.fillStyle = fb.color;
      ctx.font = "bold 20px system-ui";
      ctx.fillText(`${elbowAngle}°`, ex + 10, ey - 10);
    }
  }, [side]);

  function resetReps() {
    repCountRef.current = 0;
    setRepCount(0);
    stageRef.current = "down";
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">

      {/* Header */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-4">
        <div>
          <h2 className="text-white font-semibold text-lg">Bicep Curl — Pose Analysis</h2>
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
      <div className="relative w-full max-w-2xl rounded-xl overflow-hidden bg-[#111]">
        <video ref={videoRef} className="hidden" playsInline muted />                 {/* playsInline = dont automatically switch to fullscreen. muted = turn off videos audio  */}
        <canvas ref={canvasRef} className="w-full rounded-xl" />

        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-gray-400 text-sm">Loading MediaPipe...</p>
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
