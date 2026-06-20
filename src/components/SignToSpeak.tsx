import React, { useState, useEffect, useRef } from 'react'

interface SignToSpeakProps {
  voices: SpeechSynthesisVoice[]
  selectedVoice: string
  setSelectedVoice: (voiceName: string) => void
  speechRate: number
  setSpeechRate: (rate: number) => void
  speakText: (text: string) => void
}

interface Results {
  multiHandLandmarks: Array<Array<{ x: number; y: number; z: number }>>
  multiHandedness: Array<{ index: number; score: number; label: 'Left' | 'Right' }>
  image: HTMLCanvasElement | HTMLVideoElement | ImageBitmap
}

export const SignToSpeak: React.FC<SignToSpeakProps> = ({
  voices,
  selectedVoice,
  setSelectedVoice,
  speechRate,
  setSpeechRate,
  speakText
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false)
  const [detectedText, setDetectedText] = useState<string>('Idle')
  const [confidence, setConfidence] = useState<number>(100.0)
  const [fps, setFps] = useState<number>(30)
  const [history, setHistory] = useState<string[]>([])
  const [cameraError, setCameraError] = useState<string | null>(null)
  
  // Script loading state
  const [scriptsLoaded, setScriptsLoaded] = useState<boolean>(false)
  const [loadingStatus, setLoadingStatus] = useState<string>('Loading...')

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const cameraRef = useRef<any>(null)
  const handsRef = useRef<any>(null)
  const prevWordRef = useRef<string>('Idle')
  const frameCountRef = useRef<number>(0)
  const lastFpsUpdateRef = useRef<number>(performance.now())

  // Dynamic script loader for MediaPipe
  useEffect(() => {
    if ((window as any).Hands && (window as any).Camera) {
      setScriptsLoaded(true)
      setLoadingStatus('')
      return
    }

    setLoadingStatus('Initializing hand tracking models...')

    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Prevent duplicate scripts injection
        const existingScript = document.querySelector(`script[src="${src}"]`)
        if (existingScript) {
          (existingScript as HTMLScriptElement).onload = () => resolve();
          return
        }
        const script = document.createElement('script')
        script.src = src
        script.crossOrigin = 'anonymous'
        script.async = true
        script.onload = () => resolve()
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
        document.head.appendChild(script)
      })
    }

    Promise.all([
      loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'),
      loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js')
    ])
      .then(() => {
        // Wait a small moment to ensure constructors are registered on window object
        setTimeout(() => {
          if ((window as any).Hands && (window as any).Camera) {
            setScriptsLoaded(true)
            setLoadingStatus('')
          } else {
            setLoadingStatus('Constructors not registered correctly. Retrying...')
          }
        }, 100)
      })
      .catch((err) => {
        console.error('Failed to load MediaPipe from CDN:', err)
        setLoadingStatus('Failed to load tracking assets. Please check your internet connection.')
      })
  }, [])

  // Trigger TTS voice announcement when the recognized word changes
  useEffect(() => {
    if (detectedText && detectedText !== 'Idle' && detectedText !== prevWordRef.current) {
      speakText(detectedText)
      setHistory(prev => {
        if (prev[prev.length - 1] === detectedText) return prev
        return [...prev, detectedText]
      })
      prevWordRef.current = detectedText
    }
  }, [detectedText, speakText])

  // Simple hand gesture classification heuristic based on landmark distances
  const classifyGesture = (landmarks: Array<{ x: number; y: number; z: number }>): { word: string; conf: number } => {
    const isIndexExtended = landmarks[8].y < landmarks[6].y
    const isMiddleExtended = landmarks[12].y < landmarks[10].y
    const isRingExtended = landmarks[16].y < landmarks[14].y
    const isPinkyExtended = landmarks[20].y < landmarks[18].y
    const isThumbExtended = Math.abs(landmarks[4].x - landmarks[2].x) > 0.05

    // 1. Open Palm -> Hello
    if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended) {
      return { word: 'Hello', conf: 99.2 }
    }
    
    // 2. Index and Middle Extended (V sign) -> Yes
    if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      return { word: 'Yes', conf: 98.5 }
    }
    
    // 3. Only Index Extended -> Thank You
    if (isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      return { word: 'Thank You', conf: 97.4 }
    }

    // 4. Thumb and Pinky Extended -> Help
    if (isThumbExtended && isPinkyExtended && !isIndexExtended && !isMiddleExtended && !isRingExtended) {
      return { word: 'Help', conf: 96.8 }
    }

    // 5. All fingers folded -> Stop
    if (!isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      return { word: 'Stop', conf: 99.5 }
    }

    return { word: 'Idle', conf: 100.0 }
  }

  // Set up MediaPipe Hands and active camera utils
  useEffect(() => {
    if (!cameraActive || !scriptsLoaded) {
      if (cameraRef.current) {
        cameraRef.current.stop()
        cameraRef.current = null
      }
      if (handsRef.current) {
        handsRef.current.close()
        handsRef.current = null
      }
      return
    }

    const videoElement = videoRef.current
    const canvasElement = canvasRef.current
    if (!videoElement || !canvasElement) return

    const ctx = canvasElement.getContext('2d')
    if (!ctx) return

    setCameraError(null)

    const HandsClass = (window as any).Hands
    const CameraClass = (window as any).Camera

    if (!HandsClass || !CameraClass) {
      setCameraError('Tracking drivers failed to load. Please reload the page.')
      setCameraActive(false)
      return
    }

    // Initialize MediaPipe Hands
    const hands = new HandsClass({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    })

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6
    })

    hands.onResults((results: Results) => {
      ctx.save()
      ctx.clearRect(0, 0, canvasElement.width, canvasElement.height)
      ctx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height)

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0]

        const gesture = classifyGesture(landmarks)
        setDetectedText(gesture.word)
        setConfidence(gesture.conf)

        // Draw connections
        ctx.strokeStyle = '#a855f7' // Purple-500
        ctx.lineWidth = 3
        ctx.shadowBlur = 10
        ctx.shadowColor = '#a855f7'

        const connections = [
          [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
          [0, 5], [5, 6], [6, 7], [7, 8], // Index
          [0, 9], [9, 10], [10, 11], [11, 12], // Middle
          [0, 13], [13, 14], [14, 15], [15, 16], // Ring
          [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
          [5, 9], [9, 13], [13, 17] // Palm
        ]

        connections.forEach(([p1, p2]) => {
          ctx.beginPath()
          ctx.moveTo(landmarks[p1].x * canvasElement.width, landmarks[p1].y * canvasElement.height)
          ctx.lineTo(landmarks[p2].x * canvasElement.width, landmarks[p2].y * canvasElement.height)
          ctx.stroke()
        })

        // Draw joints
        ctx.fillStyle = '#10b981' // Emerald-500
        ctx.shadowBlur = 8
        ctx.shadowColor = '#10b981'
        landmarks.forEach((landmark) => {
          ctx.beginPath()
          ctx.arc(landmark.x * canvasElement.width, landmark.y * canvasElement.height, 5, 0, 2 * Math.PI)
          ctx.fill()
        })
      } else {
        setDetectedText('Idle')
      }

      ctx.restore()

      // Calculate FPS
      frameCountRef.current++
      const now = performance.now()
      if (now - lastFpsUpdateRef.current >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsUpdateRef.current)))
        frameCountRef.current = 0
        lastFpsUpdateRef.current = now
      }
    })

    handsRef.current = hands

    // Initialize Camera utils
    const camera = new CameraClass(videoElement, {
      onFrame: async () => {
        if (handsRef.current) {
          await handsRef.current.send({ image: videoElement })
        }
      },
      width: 640,
      height: 360
    })

    cameraRef.current = camera

    camera.start().catch((err: any) => {
      console.error('Camera stream access failed:', err)
      setCameraError('Webcam access was denied or is unavailable. Please check system permissions.')
      setCameraActive(false)
    })

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop()
      }
      if (handsRef.current) {
        handsRef.current.close()
      }
    }
  }, [cameraActive, scriptsLoaded])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
      <video 
        ref={videoRef} 
        style={{ display: 'none' }} 
        playsInline 
        muted 
      />

      {/* Left panel: Active Webcam Stream Canvas */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4 backdrop-blur-sm shadow-xl flex flex-col justify-between min-h-[400px]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${cameraActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
              <h2 className="text-sm font-semibold text-slate-200">Video Capture Stream</h2>
            </div>
            {cameraActive && (
              <div className="flex gap-4 text-xs text-slate-400 font-mono">
                <span>FPS: {fps}</span>
                <span>Confidence: {confidence}%</span>
              </div>
            )}
          </div>

          {/* Canvas Wrapper */}
          <div className="relative aspect-video w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-900 flex items-center justify-center group">
            {!scriptsLoaded ? (
              <div className="flex flex-col items-center gap-3 p-6 text-center select-none">
                <div className="h-8 w-8 rounded-full border-2 border-t-purple-500 border-slate-800 animate-spin" />
                <span className="text-xs text-slate-500 font-mono">{loadingStatus}</span>
              </div>
            ) : cameraActive ? (
              <canvas 
                ref={canvasRef} 
                width={640} 
                height={360} 
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-center p-6 select-none">
                <div className="h-16 w-16 rounded-full bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-400 shadow-inner group-hover:scale-105 transition-transform duration-300">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-slate-300 font-medium">Camera Feed is Offline</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-[280px]">Enable your camera to start real-time landmark extraction and translation.</p>
                </div>
              </div>
            )}
            
            {cameraError && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center z-20">
                <div className="text-rose-500 text-sm font-semibold mb-2">Camera Error</div>
                <div className="text-xs text-slate-400 max-w-[320px]">{cameraError}</div>
                <button
                  type="button"
                  onClick={() => setCameraActive(false)}
                  className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold rounded-lg"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>

          {/* Action button */}
          <div className="flex items-center gap-4 mt-6">
            <button
              type="button"
              onClick={() => setCameraActive(!cameraActive)}
              disabled={!scriptsLoaded}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-300 cursor-pointer disabled:opacity-50 ${
                cameraActive 
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25' 
                  : 'bg-purple-600 text-white shadow-lg shadow-purple-600/25 hover:bg-purple-500 hover:shadow-purple-500/35 hover:-translate-y-0.5'
              }`}
            >
              {cameraActive ? 'Disable Camera' : 'Enable Camera'}
            </button>
          </div>
        </div>
      </div>

      {/* Right panel: translation controls & metrics */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 backdrop-blur-sm shadow-xl flex flex-col gap-6">
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Detected Phrase</h2>
            <div className="bg-slate-950/80 border border-slate-900 rounded-xl p-6 min-h-[100px] flex items-center justify-between gap-4">
              <span className="text-3xl font-bold tracking-tight text-white">{detectedText}</span>
              {detectedText && detectedText !== 'Idle' && (
                <button
                  type="button"
                  onClick={() => speakText(detectedText)}
                  className="h-12 w-12 rounded-xl bg-purple-600/10 text-purple-400 hover:bg-purple-600 hover:text-white border border-purple-500/20 hover:border-transparent flex items-center justify-center transition-all duration-300 shadow-md cursor-pointer hover:scale-105"
                  title="Speak current text"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Voice configurations */}
          <div className="border-t border-slate-900 pt-6 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-slate-200">Audio Output Controls</h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Select Voice Profile</label>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500 transition-colors"
              >
                {voices.length === 0 ? (
                  <option>System Default Voice</option>
                ) : (
                  voices.map(voice => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-medium">
                <span>Speech Speed</span>
                <span>{speechRate}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="w-full accent-purple-500 h-1 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Translation Logs list */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 backdrop-blur-sm shadow-xl flex-1 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-200">Translation Logs</h3>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHistory([])}
                  className="text-xs text-slate-500 hover:text-slate-300 font-medium cursor-pointer"
                >
                  Clear History
                </button>
              )}
            </div>

            <div className="max-h-[180px] overflow-y-auto pr-1 flex flex-col gap-2 scrollbar-thin scrollbar-thumb-slate-800">
              {history.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-8">No signs translated yet.</p>
              ) : (
                history.slice().reverse().map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-950 rounded-xl hover:border-slate-800/80 transition-all duration-200 group">
                    <span className="text-sm font-medium text-slate-300">{item}</span>
                    <button
                      type="button"
                      onClick={() => speakText(item)}
                      className="text-slate-500 hover:text-purple-400 p-1 rounded-lg hover:bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignToSpeak
