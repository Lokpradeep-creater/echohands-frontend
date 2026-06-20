import { useState, useEffect, useRef } from 'react'

function App() {
  const [cameraActive, setCameraActive] = useState<boolean>(false)
  const [detectedText, setDetectedText] = useState<string>('Hello')
  const [isTranslating, setIsTranslating] = useState<boolean>(false)
  const [confidence, setConfidence] = useState<number>(98.4)
  const [fps, setFps] = useState<number>(30)
  const [history, setHistory] = useState<string[]>(['Hello', 'Welcome', 'To', 'EchoHands'])
  
  // Speech Synthesis Settings
  const [speechRate, setSpeechRate] = useState<number>(1.0)
  const [selectedVoice, setSelectedVoice] = useState<string>('')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationRef = useRef<number | null>(null)

  // Populate Web Speech voices
  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const availableVoices = window.speechSynthesis.getVoices()
        setVoices(availableVoices)
        if (availableVoices.length > 0 && !selectedVoice) {
          // Default to first English voice or first available
          const defaultVoice = availableVoices.find(v => v.lang.includes('en')) || availableVoices[0]
          setSelectedVoice(defaultVoice.name)
        }
      }
    }
    updateVoices()
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoices
    }
  }, [selectedVoice])

  // Handle Text to Speech
  const speakText = (textToSpeak: string) => {
    if (!textToSpeak) return
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // Cancel active speech
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(textToSpeak)
      if (selectedVoice) {
        const voiceObj = voices.find(v => v.name === selectedVoice)
        if (voiceObj) utterance.voice = voiceObj
      }
      utterance.rate = speechRate
      window.speechSynthesis.speak(utterance)
    }
  }

  // Simulate Live Hand Landmarks Tracking on Canvas
  useEffect(() => {
    if (!cameraActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let frame = 0
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Draw simulated camera background (dark glowing circle)
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Camera static noise/grid helper
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.05)'
      ctx.lineWidth = 1
      for (let i = 0; i < canvas.width; i += 20) {
        ctx.beginPath()
        ctx.moveTo(i, 0)
        ctx.lineTo(i, canvas.height)
        ctx.stroke()
      }
      for (let j = 0; j < canvas.height; j += 20) {
        ctx.beginPath()
        ctx.moveTo(0, j)
        ctx.lineTo(canvas.width, j)
        ctx.stroke()
      }

      // Draw hand landmarks (Simulated movement)
      const t = frame * 0.05
      const offsetHashX = Math.sin(t) * 15
      const offsetHashY = Math.cos(t * 0.7) * 10

      const wrist = { x: 200 + offsetHashX, y: 300 + offsetHashY }
      const thumb = [
        { x: 160 + offsetHashX * 0.8, y: 260 + offsetHashY * 0.8 },
        { x: 130 + offsetHashX * 0.6, y: 220 + offsetHashY * 0.6 },
        { x: 100 + offsetHashX * 0.4, y: 190 + offsetHashY * 0.4 }
      ]
      const indexFinger = [
        { x: 180 + offsetHashX, y: 210 + offsetHashY * 1.1 },
        { x: 175 + offsetHashX, y: 160 + offsetHashY * 1.2 },
        { x: 170 + offsetHashX, y: 120 + offsetHashY * 1.3 }
      ]
      const middleFinger = [
        { x: 210 + offsetHashX * 1.1, y: 200 + offsetHashY },
        { x: 210 + offsetHashX * 1.2, y: 140 + offsetHashY * 1.1 },
        { x: 210 + offsetHashX * 1.3, y: 95 + offsetHashY * 1.2 }
      ]
      const ringFinger = [
        { x: 240 + offsetHashX * 0.9, y: 210 + offsetHashY * 0.9 },
        { x: 245 + offsetHashX * 0.8, y: 155 + offsetHashY * 0.8 },
        { x: 250 + offsetHashX * 0.7, y: 110 + offsetHashY * 0.7 }
      ]
      const pinkyFinger = [
        { x: 270 + offsetHashX * 0.7, y: 235 + offsetHashY * 0.7 },
        { x: 285 + offsetHashX * 0.5, y: 195 + offsetHashY * 0.5 },
        { x: 300 + offsetHashX * 0.3, y: 160 + offsetHashY * 0.3 }
      ]

      const fingers = [thumb, indexFinger, middleFinger, ringFinger, pinkyFinger]

      // Draw skeleton lines
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)' // Purple-500
      ctx.lineWidth = 3
      ctx.shadowBlur = 15
      ctx.shadowColor = '#a855f7'

      fingers.forEach(finger => {
        ctx.beginPath()
        ctx.moveTo(wrist.x, wrist.y)
        finger.forEach(pt => ctx.lineTo(pt.x, pt.y))
        ctx.stroke()
      })

      // Draw joints
      ctx.fillStyle = '#10b981' // Emerald-500
      ctx.shadowBlur = 10
      ctx.shadowColor = '#10b981'
      
      const allPoints = [wrist, ...thumb, ...indexFinger, ...middleFinger, ...ringFinger, ...pinkyFinger]
      allPoints.forEach(pt => {
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI)
        ctx.fill()
      })

      // Add a clean overlay scanning line
      ctx.shadowBlur = 0
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)'
      ctx.lineWidth = 2
      const scanY = (frame * 2) % canvas.height
      ctx.beginPath()
      ctx.moveTo(0, scanY)
      ctx.lineTo(canvas.width, scanY)
      ctx.stroke()

      // Active indicator text
      ctx.fillStyle = '#10b981'
      ctx.font = 'bold 12px monospace'
      ctx.fillText('LIVE TRACKING ACTIVE', 15, 25)

      frame++
      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [cameraActive])

  // Simulate real-time FPS variance slightly
  useEffect(() => {
    if (!cameraActive) return
    const interval = setInterval(() => {
      setFps(Math.floor(Math.random() * 3) + 28)
      setConfidence(parseFloat((97.5 + Math.random() * 2).toFixed(1)))
    }, 1500)
    return () => clearInterval(interval)
  }, [cameraActive])

  // Run Translation Simulation
  const triggerSimulation = () => {
    if (isTranslating) return
    setIsTranslating(true)
    
    const demoPhrases = ['Hello', 'Welcome', 'To', 'EchoHands']
    let index = 0

    const simulateStep = () => {
      if (index < demoPhrases.length) {
        const phrase = demoPhrases[index]
        setDetectedText(phrase)
        speakText(phrase)
        setHistory(prev => {
          // Avoid duplicate consecutive logs
          if (prev[prev.length - 1] === phrase) return prev
          return [...prev, phrase]
        })
        index++
        setTimeout(simulateStep, 1500)
      } else {
        setIsTranslating(false)
      }
    }

    // Toggle camera on during simulation
    setCameraActive(true)
    simulateStep()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans">
      {/* Decorative Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">EchoHands</h1>
            <p className="text-xs text-slate-400">Sign Language to Speech System</p>
          </div>
        </div>

        {/* Global Stats */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-400 text-xs">Model: <strong className="text-slate-200 font-medium">Hand-Landmarks-v2</strong></span>
          </div>
          <div className="hidden sm:flex items-center gap-2 border-l border-slate-800 pl-6">
            <span className="text-slate-400 text-xs">Latency: <strong className="text-slate-200 font-medium">12ms</strong></span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Camera capture & tracking */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4 backdrop-blur-sm shadow-xl flex flex-col justify-between flex-1 min-h-[400px]">
            {/* Visual Canvas Header */}
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

            {/* Video / Canvas Placeholder */}
            <div className="relative aspect-video w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-900 flex items-center justify-center group">
              {cameraActive ? (
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

              {/* Grid overlay for futuristic vibe */}
              <div className="absolute inset-0 border border-purple-500/0 rounded-xl pointer-events-none group-hover:border-purple-500/10 transition-colors duration-500"></div>
            </div>

            {/* Control buttons */}
            <div className="flex flex-wrap items-center gap-4 mt-6">
              <button
                type="button"
                onClick={() => setCameraActive(!cameraActive)}
                className={`flex-1 min-w-[160px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-300 cursor-pointer ${
                  cameraActive 
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25' 
                    : 'bg-purple-600 text-white shadow-lg shadow-purple-600/25 hover:bg-purple-500 hover:shadow-purple-500/35 hover:-translate-y-0.5'
                }`}
              >
                {cameraActive ? (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    Disable Camera
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Enable Camera
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={triggerSimulation}
                disabled={isTranslating}
                className="flex-1 min-w-[160px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700/80 disabled:opacity-50 disabled:hover:bg-slate-800 transition-all duration-300 font-medium text-sm cursor-pointer"
              >
                <svg className={`h-4 w-4 ${isTranslating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 4.79M9 11l3 3L22 4" />
                </svg>
                {isTranslating ? 'Simulating...' : 'Simulate Hand Signs'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Interpretation, Output Controls, TTS configurations */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Main Output Box */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 backdrop-blur-sm shadow-xl flex flex-col gap-6">
            <div>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Detected Phrase</h2>
              <div className="bg-slate-950/80 border border-slate-900 rounded-xl p-6 min-h-[100px] flex items-center justify-between gap-4">
                <span className="text-3xl font-bold tracking-tight text-white">{detectedText || '—'}</span>
                
                {detectedText && (
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

            {/* Speech Settings */}
            <div className="border-t border-slate-900 pt-6 flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-slate-200">Audio Output Controls</h3>
              
              {/* Voice Selector */}
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

              {/* Speed Slider */}
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

          {/* Translation Logs / History */}
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

              <div className="max-h-[220px] overflow-y-auto pr-1 flex flex-col gap-2 scrollbar-thin scrollbar-thumb-slate-800">
                {history.length === 0 ? (
                  <p className="text-xs text-slate-600 text-center py-8">No signs translated yet.</p>
                ) : (
                  history.slice().reverse().map((item, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-950 rounded-xl hover:border-slate-800/80 transition-all duration-200 group"
                    >
                      <span className="text-sm font-medium text-slate-300">{item}</span>
                      <button
                        type="button"
                        onClick={() => speakText(item)}
                        className="text-slate-500 hover:text-purple-400 p-1 rounded-lg hover:bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
                        title="Replay Audio"
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
            
            <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3 text-[11px] text-slate-500 leading-relaxed">
              <strong>Tip:</strong> The speech engine reads text out loud in real time as the system translates signs. Adjust speeds or voice accents above to match your preference.
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-900 py-6 px-6 text-center text-xs text-slate-500">
        <div>
          <span>&copy; {new Date().getFullYear()} EchoHands Project. Developed for accessibility and real-time translation.</span>
        </div>
      </footer>
    </div>
  )
}

export default App
