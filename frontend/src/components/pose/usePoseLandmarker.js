import { useEffect } from "react";
import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";    // PoseLandmarker detects human body landmarks using ML. filesetresolver class helps load wasm (webassembly) files that mp needs to run in browser

import drawResults  from "./poseDrawing";

function usePoseLandmarker({videoRef, canvasRef, landmarkerRef, animFrameRef, lastVideoTime, setStatus,  sideRef, stageRef, repCountRef, rules, MP, angleBetween,
    setAngle, setRepCount, setFeedback,}) {
    useEffect(() => {                 // initialising PoseLandmarker
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
        drawResults(results, canvas, video, {
            sideRef, stageRef, repCountRef, rules, MP, angleBetween,
            setAngle, setRepCount, setFeedback,
          });
        }

        // video.currentTime      -> properties/methods of <video> element
        // video.readyState
        // video.play()
        // video.videoWidth

        animFrameRef.current = requestAnimationFrame(processFrame);
    }
}


export default usePoseLandmarker;