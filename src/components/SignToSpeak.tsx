import React, { useState, useEffect, useRef } from 'react'
// Resolve MediaPipe constructors dynamically from window
// @ts-ignore
const Hands = (typeof window !== 'undefined' ? (window as any).Hands : null) as any
// @ts-ignore
const Camera = (typeof window !== 'undefined' ? (window as any).Camera : null) as any

interface Results {
  multiHandLandmarks: Array<Array<{ x: number; y: number; z: number }>>
  multiHandedness: Array<{ index: number; score: number; label: 'Left' | 'Right' }>
  image: HTMLCanvasElement | HTMLVideoElement | ImageBitmap
}

interface SignToSpeakProps {
  voices: SpeechSynthesisVoice[]
  selectedVoice: string
  setSelectedVoice: (voiceName: string) => void
  speechRate: number
  setSpeechRate: (rate: number) => void
  speakText: (text: string) => void
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
  
  // Real-time gesture states
  const [liveGesture, setLiveGesture] = useState<string>('none')
  const [tokenBuffer, setTokenBuffer] = useState<string[]>([])
  const [detectedText, setDetectedText] = useState<string>('Idle')
  const [confidence, setConfidence] = useState<number>(100.0)
  const [fps, setFps] = useState<number>(30)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [wsStatus, setWsStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  
  // Script loading state
  const [scriptsLoaded, setScriptsLoaded] = useState<boolean>(false)
  const [loadingStatus, setLoadingStatus] = useState<string>('Loading...')

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const cameraRef = useRef<any>(null)
  const handsRef = useRef<any>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const lastSentTimeRef = useRef<number>(0)
  const prevPhraseRef = useRef<string>('Idle')
  const frameCountRef = useRef<number>(0)
  const lastFpsUpdateRef = useRef<number>(performance.now())

  // Stabilizer states
  const stableGestureRef = useRef<string>('none')
  const stableFramesRef = useRef<number>(0)

  // Target Sentences Dictionary
  const targetPhrasesRecipes = [
    { recipe: ['hello', 'everyone'], sentence: 'hello everyone' },
    { recipe: ['how', 'you'], sentence: 'how are you?' },
    { recipe: ['thank', 'you'], sentence: 'thank you' },
    { recipe: ['had', 'breakfast'], sentence: 'had your breakfast?' },
    { recipe: ['what', 'name'], sentence: 'what is your name?' }
  ]

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

  // Manage WebSocket connection lifecycle
  useEffect(() => {
    if (!cameraActive) {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      setWsStatus('disconnected')
      return
    }

    setWsStatus('connecting')
    const ws = new WebSocket("ws://127.0.0.1:8000/api/ws/gestures")
    wsRef.current = ws

    ws.onopen = () => {
      setWsStatus('connected')
      console.log('WebSocket connection to backend established.')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'gesture_matched') {
          if (data.gesture) {
            setLiveGesture(data.gesture)
          }
          if (data.confidence !== undefined) {
            setConfidence(Math.round(data.confidence * 100))
          }
          if (data.current_sentence !== undefined) {
            // Keep the local tokenBuffer visual synced with backend state
            const tokens = data.current_sentence ? data.current_sentence.trim().split(/\s+/) : []
            setTokenBuffer(tokens)
          }
        } else if (data.type === 'sentence_finalized') {
          if (data.sentence) {
            setDetectedText(data.sentence)
            speakText(data.sentence)
          }
          setTokenBuffer([])
          setLiveGesture('none')
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message from backend:', err)
      }
    }

    ws.onerror = (err) => {
      console.error('WebSocket connection error:', err)
    }

    ws.onclose = () => {
      setWsStatus('disconnected')
      console.log('WebSocket connection closed.')
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [cameraActive, speakText])

  // Trigger TTS voice announcement when the recognized sentence changes
  useEffect(() => {
    if (detectedText && detectedText !== 'Idle' && detectedText !== prevPhraseRef.current) {
      speakText(detectedText)
      prevPhraseRef.current = detectedText
    }
  }, [detectedText, speakText])

  // Sentence assembler: runs whenever tokenBuffer changes
  useEffect(() => {
    if (tokenBuffer.length === 0) return

    // Find if the current buffer matches any recipe
    const match = targetPhrasesRecipes.find(item => {
      if (item.recipe.length !== tokenBuffer.length) return false
      return item.recipe.every((tok, idx) => tokenBuffer[idx] === tok)
    })

    if (match) {
      // Set the matched sentence
      setDetectedText(match.sentence)
      // Reset the buffer to allow next sentence assembly
      setTokenBuffer([])
    }
  }, [tokenBuffer])

  // Check finger extension coordinates
  const classifyGesture = (landmarks: Array<{ x: number; y: number; z: number }>): string => {
    const isIndexExtended = landmarks[8].y < landmarks[6].y
    const isMiddleExtended = landmarks[12].y < landmarks[10].y
    const isRingExtended = landmarks[16].y < landmarks[14].y
    const isPinkyExtended = landmarks[20].y < landmarks[18].y
    const isThumbExtended = Math.abs(landmarks[4].x - landmarks[2].x) > 0.05

    // 1. Open Palm -> palm
    if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended) {
      return 'palm'
    }
    
    // 2. V Sign -> vsign
    if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      return 'vsign'
    }
    
    // 3. Only Index Extended -> point
    if (isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      return 'point'
    }

    // 4. Thumb and Pinky Extended -> shaka
    if (isThumbExtended && isPinkyExtended && !isIndexExtended && !isMiddleExtended && !isRingExtended) {
      return 'shaka'
    }

    // 5. Thumbs Up -> thumbsup
    if (isThumbExtended && !isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      return 'thumbsup'
    }

    // 6. Rock On -> rockon
    if (isIndexExtended && !isMiddleExtended && !isRingExtended && isPinkyExtended) {
      return 'rockon'
    }

    // 7. All fingers folded -> fist
    if (!isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      return 'fist'
    }

    return 'none'
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

        // 1. Throttle and stream coordinates over WebSocket if connected
        const now = performance.now()
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && (now - lastSentTimeRef.current >= 100)) {
          const handType = results.multiHandedness?.[0]?.label || 'Right'
          const payload = {
            right_hand: handType === 'Right' ? { landmarks } : null,
            left_hand: handType === 'Left' ? { landmarks } : null
          }
          wsRef.current.send(JSON.stringify(payload))
          lastSentTimeRef.current = now
        }

        // 2. Fallback to local classification if WebSocket is offline/disconnected
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          const gesture = classifyGesture(landmarks)
          setLiveGesture(gesture)

          // Stabilization logic: must detect the same gesture for 30 consecutive frames
          if (gesture !== 'none') {
            if (gesture === stableGestureRef.current) {
              stableFramesRef.current++
              if (stableFramesRef.current >= 30) {
                // Convert gesture to a token based on current buffer state
                let token = 'none'
                
                if (gesture === 'palm') token = 'hello'
                else if (gesture === 'vsign') token = 'everyone'
                else if (gesture === 'thumbsup') token = 'thank'
                else if (gesture === 'point') token = 'you'
                else if (gesture === 'rockon') token = 'how'
                else if (gesture === 'fist') {
                  // If "what" is in the buffer, map fist to "name", else "had"
                  token = tokenBuffer.includes('what') ? 'name' : 'had'
                } else if (gesture === 'shaka') {
                  // If "had" is in the buffer, map shaka to "breakfast", else "what"
                  token = tokenBuffer.includes('had') ? 'breakfast' : 'what'
                }

                if (token !== 'none') {
                  // Check that it's not a duplicate of the last token in buffer
                  setTokenBuffer(prev => {
                    if (prev[prev.length - 1] === token) return prev
                    return [...prev, token]
                  })
                }
                // Reset frame count so we don't trigger repeatedly
                stableFramesRef.current = 0
              }
            } else {
              stableGestureRef.current = gesture
              stableFramesRef.current = 0
            }
          }
        }

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
        landmarks.forEach((landmark: any) => {
          ctx.beginPath()
          ctx.arc(landmark.x * canvasElement.width, landmark.y * canvasElement.height, 5, 0, 2 * Math.PI)
          ctx.fill()
        })
      } else {
        setLiveGesture('none')
        stableGestureRef.current = 'none'
        stableFramesRef.current = 0
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
        if (cameraActive && handsRef.current) {
          try {
            await handsRef.current.send({ image: videoElement })
          } catch (err) {
            console.warn('MediaPipe hands send failed:', err)
          }
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
        try {
          cameraRef.current.stop()
        } catch (e) {
          console.warn('Failed to stop camera:', e)
        }
        cameraRef.current = null
      }
      
      const handsInstance = handsRef.current
      handsRef.current = null

      if (handsInstance) {
        try {
          handsInstance.close()
        } catch (e) {
          console.warn('Failed to close hands tracker:', e)
        }
      }
    }
  }, [cameraActive, scriptsLoaded])

  // Mock simulation for targeting full sentences
  const triggerSimulation = (sentence: string) => {
    setDetectedText(sentence)
  }

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
              <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">WS Status:</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                    wsStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    wsStatus === 'connecting' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse' :
                    'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {wsStatus.toUpperCase()}
                  </span>
                </div>
                <span>FPS: {fps}</span>
                <span>Confidence: {confidence}%</span>
                <span>Active Shape: <strong className="text-purple-400 capitalize">{liveGesture}</strong></span>
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
          <div className="flex flex-wrap items-center gap-4 mt-6">
            <button
              type="button"
              onClick={() => setCameraActive(!cameraActive)}
              disabled={!scriptsLoaded}
              className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-300 cursor-pointer disabled:opacity-50 ${
                cameraActive 
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25' 
                  : 'bg-purple-600 text-white shadow-lg shadow-purple-600/25 hover:bg-purple-500 hover:shadow-purple-500/35 hover:-translate-y-0.5'
              }`}
            >
              {cameraActive ? 'Disable Camera' : 'Enable Camera'}
            </button>
          </div>
        </div>

        {/* Token Buffer HUD */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 backdrop-blur-sm shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gesture Token Buffer</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTokenBuffer(prev => prev.slice(0, -1))}
                disabled={tokenBuffer.length === 0}
                className="text-[10px] text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-900 rounded px-2.5 py-1 disabled:opacity-50"
              >
                Backspace
              </button>
              <button
                type="button"
                onClick={() => setTokenBuffer([])}
                disabled={tokenBuffer.length === 0}
                className="text-[10px] text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-900 rounded px-2.5 py-1 disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="min-h-[50px] bg-slate-950/80 border border-slate-900 rounded-xl p-3 flex flex-wrap items-center gap-2">
            {tokenBuffer.length === 0 ? (
              <span className="text-xs text-slate-600">Buffer is empty. Hold gestures to assemble tokens.</span>
            ) : (
              tokenBuffer.map((tok, idx) => (
                <React.Fragment key={idx}>
                  <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 font-mono text-xs px-2.5 py-1 rounded-md font-semibold">
                    {tok}
                  </span>
                  {idx < tokenBuffer.length - 1 && <span className="text-slate-600 text-xs font-bold">→</span>}
                </React.Fragment>
              ))
            )}
          </div>
          
          {/* Guide cheatsheet */}
          <div className="border-t border-slate-900 pt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-slate-500 leading-normal">
            <div><strong className="text-slate-400">Palm:</strong> hello / thank</div>
            <div><strong className="text-slate-400">V Sign:</strong> everyone / how</div>
            <div><strong className="text-slate-400">Point:</strong> you</div>
            <div><strong className="text-slate-400">Shaka:</strong> breakfast / what</div>
            <div><strong className="text-slate-400">Fist:</strong> had / name</div>
            <div><strong className="text-slate-400">ThumbsUp:</strong> thank</div>
            <div><strong className="text-slate-400">RockOn:</strong> how</div>
          </div>
        </div>
      </div>

      {/* Right panel: translation controls & metrics */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 backdrop-blur-sm shadow-xl flex flex-col gap-6">
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Assembled Sentence</h2>
            <div className="bg-slate-950/80 border border-slate-900 rounded-xl p-6 min-h-[100px] flex items-center justify-between gap-4">
              <span className="text-2xl font-bold tracking-tight text-white capitalize">{detectedText}</span>
              {detectedText && detectedText !== 'Idle' && (
                <button
                  type="button"
                  onClick={() => speakText(detectedText)}
                  className="h-12 w-12 rounded-xl bg-purple-600/10 text-purple-400 hover:bg-purple-600 hover:text-white border border-purple-500/20 hover:border-transparent flex items-center justify-center transition-all duration-300 shadow-md cursor-pointer hover:scale-105"
                  title="Speak current sentence"
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

        {/* Dynamic Simulation selectors for targeting full sentences */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 backdrop-blur-sm shadow-xl flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-slate-200">Trigger Target Phrases</h3>
          <div className="flex flex-col gap-2">
            {targetPhrasesRecipes.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => triggerSimulation(item.sentence)}
                className="w-full text-left p-3 bg-slate-950/80 hover:bg-slate-950 border border-slate-900 hover:border-purple-500/30 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer flex justify-between items-center group"
              >
                <span className="capitalize">{item.sentence}</span>
                <span className="text-[10px] text-slate-500 font-mono group-hover:text-purple-400">
                  {item.recipe.join(' + ')}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignToSpeak
