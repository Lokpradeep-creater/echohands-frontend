import React, { useState, useEffect, useRef } from 'react'

export const SpeakToSign: React.FC = () => {
  const [micActive, setMicActive] = useState<boolean>(false)
  const [inputText, setInputText] = useState<string>('')
  const [recognizedText, setRecognizedText] = useState<string>('Hello')
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0)
  
  // Playlist tracking
  const [activeWordIndex, setActiveWordIndex] = useState<number>(0)
  const [spellingIndex, setSpellingIndex] = useState<number>(0)
  const [isSpellingMode, setIsSpellingMode] = useState<boolean>(false)
  const [isListening, setIsListening] = useState<boolean>(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationRef = useRef<number | null>(null)

  // Split recognized text into words
  const wordsList = recognizedText.trim().toLowerCase().split(/\s+/).filter(Boolean)

  // Dictionary of known words mapped to custom SVG representations
  const signDictionary: Record<string, { label: string; description: string; svg: React.ReactNode }> = {
    hello: {
      label: 'HELLO',
      description: 'Waving open hand gesture with fingers spread out.',
      svg: (
        <svg viewBox="0 0 100 100" className="h-28 w-28 text-purple-400 animate-pulse">
          <defs>
            <linearGradient id="helloGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          {/* Hand Palm and Fingers */}
          <path
            d="M50 85 C40 85 30 75 35 60 L38 52 C35 50 33 46 34 40 L35 30 C36 28 39 28 40 30 L41 45 L44 25 C45 23 48 23 49 25 L50 45 L53 23 C54 21 57 21 58 23 L59 45 L62 25 C63 23 66 23 67 25 L67 48 L71 35 C72 33 75 34 75 36 L72 56 C70 68 62 85 50 85 Z"
            fill="url(#helloGrad)"
            stroke="#c084fc"
            strokeWidth="2"
          />
          {/* Movement lines */}
          <path d="M22 35 C20 40 20 50 22 55" stroke="#10b981" strokeWidth="2" strokeLinecap="round" fill="none" className="animate-ping" />
          <path d="M78 35 C80 40 80 50 78 55" stroke="#10b981" strokeWidth="2" strokeLinecap="round" fill="none" className="animate-ping" />
        </svg>
      )
    },
    'thank you': {
      label: 'THANK YOU',
      description: 'Flat open hand moving forward and down from the chin.',
      svg: (
        <svg viewBox="0 0 100 100" className="h-28 w-28 text-indigo-400">
          <defs>
            <linearGradient id="thankGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          {/* Side Profile Hand moving from mouth */}
          <path
            d="M25 45 C35 42 45 42 55 45 L75 50 C80 51 82 55 80 58 L70 65 C60 70 45 70 35 65 Z"
            fill="url(#thankGrad)"
            stroke="#60a5fa"
            strokeWidth="2"
          />
          {/* Chin reference dot */}
          <circle cx="20" cy="35" r="4" fill="#a855f7" />
          {/* Action movement arrow */}
          <path
            d="M30 40 Q50 30 70 45"
            fill="none"
            stroke="#10b981"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="4,4"
          />
          <path d="M65 40 L71 46 L63 48" fill="none" stroke="#10b981" strokeWidth="3" />
        </svg>
      )
    },
    yes: {
      label: 'YES',
      description: 'Closed fist tilting forward and backward, nodding.',
      svg: (
        <svg viewBox="0 0 100 100" className="h-28 w-28 text-emerald-400">
          <defs>
            <linearGradient id="yesGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          {/* Fist representation */}
          <rect x="35" y="40" width="30" height="30" rx="8" fill="url(#yesGrad)" stroke="#34d399" strokeWidth="2" />
          <path d="M30 50 C30 42 35 38 42 40 L60 43 C64 44 66 48 65 52 L60 65 C58 68 52 70 45 70 Z" fill="url(#yesGrad)" opacity="0.9" />
          {/* Thumb folded across */}
          <path d="M30 55 Q45 58 55 50" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" />
          {/* Nodes indicating nodding */}
          <path d="M50 20 L50 30" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M47 26 L50 31 L53 26" fill="none" stroke="#a855f7" strokeWidth="2.5" />
          <path d="M50 80 L50 72" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M47 74 L50 69 L53 74" fill="none" stroke="#a855f7" strokeWidth="2.5" />
        </svg>
      )
    },
    no: {
      label: 'NO',
      description: 'Extended index and middle finger snap down onto the thumb.',
      svg: (
        <svg viewBox="0 0 100 100" className="h-28 w-28 text-rose-400">
          <defs>
            <linearGradient id="noGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
          </defs>
          {/* Hand profile showing closed fingers */}
          <path
            d="M30 70 C35 70 40 60 38 52 L40 42 C40 38 45 38 45 42 L42 55 L48 42 C48 38 53 38 53 42 L47 58 L54 65 C58 70 45 75 30 70 Z"
            fill="url(#noGrad)"
            stroke="#fda4af"
            strokeWidth="2"
          />
          {/* Thumb touching fingers */}
          <path d="M30 58 Q42 52 46 56" fill="none" stroke="#fda4af" strokeWidth="3" strokeLinecap="round" />
          {/* Snap wave indicator */}
          <path d="M55 45 C60 48 60 52 55 55" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    },
    stop: {
      label: 'STOP',
      description: 'Flat open palm extended outward, fingers vertical.',
      svg: (
        <svg viewBox="0 0 100 100" className="h-28 w-28 text-amber-400">
          <defs>
            <linearGradient id="stopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
          <path
            d="M50 85 C42 85 36 78 36 68 L36 45 C36 42 39 40 41 40 C43 40 45 42 45 45 L45 35 C45 32 48 30 50 30 C52 30 54 32 54 35 L54 32 C54 29 57 27 59 27 C61 27 63 29 63 32 L63 38 C63 35 66 33 68 33 C70 33 72 35 72 38 L72 68 C72 78 66 85 50 85 Z"
            fill="url(#stopGrad)"
            stroke="#fcd34d"
            strokeWidth="2"
          />
          {/* Outer glow ring */}
          <circle cx="50" cy="50" r="46" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="6,4" className="animate-spin" style={{ animationDuration: '20s' }} />
        </svg>
      )
    }
  }

  // Playback timer loop to step through words list or spelling letters
  useEffect(() => {
    if (!isPlaying || wordsList.length === 0) return

    const stepInterval = 1500 / playbackSpeed
    const timer = setInterval(() => {
      const activeWord = wordsList[activeWordIndex]
      const hasWord = activeWord in signDictionary

      if (hasWord) {
        // Simple word playback: jump to next word
        setIsSpellingMode(false)
        setActiveWordIndex((prev) => (prev + 1) % wordsList.length)
      } else {
        // Unknown word: spell it out letter-by-letter
        setIsSpellingMode(true)
        if (spellingIndex < activeWord.length - 1) {
          setSpellingIndex((prev) => prev + 1)
        } else {
          // Finished spelling this word, move to next word
          setSpellingIndex(0)
          setIsSpellingMode(false)
          setActiveWordIndex((prev) => (prev + 1) % wordsList.length)
        }
      }
    }, stepInterval)

    return () => clearInterval(timer)
  }, [isPlaying, activeWordIndex, spellingIndex, wordsList, playbackSpeed])

  // Reset indices when recognized text changes
  useEffect(() => {
    setActiveWordIndex(0)
    setSpellingIndex(0)
    setIsSpellingMode(false)
  }, [recognizedText])

  // Mic audio level peaks visualizer
  useEffect(() => {
    if (!micActive) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let frame = 0
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      const numLines = 25
      const spacing = canvas.width / numLines
      const centerY = canvas.height / 2

      for (let i = 0; i < numLines; i++) {
        const x = i * spacing + spacing / 2
        const distanceToCenter = Math.abs(i - numLines / 2) / (numLines / 2)
        const multiplier = Math.max(0, 1 - distanceToCenter)
        const wave = Math.sin(frame * 0.1 + i * 0.3) + Math.cos(frame * 0.07 + i * 0.5)
        const amp = wave * 22 * multiplier * (0.4 + Math.random() * 0.6)
        const height = Math.max(4, Math.abs(amp))

        const gradient = ctx.createLinearGradient(x, centerY - height, x, centerY + height)
        gradient.addColorStop(0, '#6366f1')
        gradient.addColorStop(0.5, '#a855f7')
        gradient.addColorStop(1, '#6366f1')

        ctx.strokeStyle = gradient
        ctx.beginPath()
        ctx.moveTo(x, centerY - height)
        ctx.lineTo(x, centerY + height)
        ctx.stroke()
      }

      ctx.fillStyle = '#6366f1'
      ctx.font = 'bold 11px monospace'
      ctx.fillText('LISTENING FOR AUDIO INPUT...', 15, 25)

      frame++
      animationRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [micActive])

  // Voice speech synthesis recognition simulation
  const startVoiceListening = () => {
    if (isListening) return
    setIsListening(true)
    setMicActive(true)

    // Simulate audio recognition output
    const demoPhrases = ['hello', 'thank you', 'yes', 'no', 'stop', 'welcome']
    setTimeout(() => {
      const randomPhrase = demoPhrases[Math.floor(Math.random() * demoPhrases.length)]
      setRecognizedText(randomPhrase)
      setIsListening(false)
      setMicActive(false)
      setIsPlaying(true)
    }, 2500)
  }

  // Handle manual typing translation
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return
    setRecognizedText(inputText)
    setInputText('')
  }

  // Determine what sign graphic to render currently
  const renderSignOutput = () => {
    if (wordsList.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="h-14 w-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-3">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h4 className="text-slate-400 font-medium text-sm">No Speech Input Received</h4>
          <p className="text-[11px] text-slate-600 mt-1 max-w-[220px]">Speak or type manual text to render matching sign postures.</p>
        </div>
      )
    }

    const currentWord = wordsList[activeWordIndex]
    const match = signDictionary[currentWord]

    if (match && !isSpellingMode) {
      // 1. Render mapped dictionary word graphic
      return (
        <div className="flex flex-col items-center justify-center p-4 text-center">
          {match.svg}
          <h3 className="text-white font-bold text-lg mt-4 uppercase tracking-wider">{match.label}</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-[280px]">{match.description}</p>
        </div>
      )
    } else {
      // 2. Fallback: spell out letters of the unknown word
      const letter = currentWord[spellingIndex]?.toUpperCase()
      return (
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <div className="h-28 w-28 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center relative overflow-hidden group">
            {/* Hologram raster line effect */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(168,85,247,0.02)_1px,transparent_1px)] bg-[size:100%_4px]" />
            <span className="text-5xl font-extrabold text-purple-400 font-mono tracking-tighter">
              {letter}
            </span>
          </div>
          <h3 className="text-white font-bold text-lg mt-4 uppercase tracking-wider">SPELLING: "{currentWord.toUpperCase()}"</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
            Spelling letter <strong className="text-purple-400 font-mono text-sm">"{letter}"</strong> sequentially (not in default dictionary).
          </p>
        </div>
      )
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
      {/* Left panel: Mic listener & text inputs (Untouched) */}
      <div className="lg:col-span-6 flex flex-col gap-6">
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 backdrop-blur-sm shadow-xl flex flex-col gap-6">
          <h2 className="text-sm font-semibold text-slate-200">Speech Input Recording</h2>

          {/* Waveform / Mic Panel */}
          <div className="relative h-[180px] w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-900 flex items-center justify-center group">
            {micActive ? (
              <canvas 
                ref={canvasRef} 
                width={400} 
                height={180} 
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-center p-6 select-none">
                <button
                  type="button"
                  onClick={startVoiceListening}
                  disabled={isListening}
                  className="h-16 w-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shadow-inner hover:text-purple-400 hover:border-purple-500/50 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
                >
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
                <div>
                  <h3 className="text-slate-300 font-medium text-sm">
                    {isListening ? 'Listening...' : 'Microphone Offline'}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-[240px]">
                    {isListening ? 'Speak a word now...' : 'Tap the microphone to convert spoken voice to sign language.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Manual text form */}
          <form onSubmit={handleTextSubmit} className="flex flex-col gap-3">
            <label className="text-xs text-slate-400 font-medium font-sans">Or type manually to translate</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type words here (e.g. hello, yes, stop)"
                className="flex-1 bg-slate-950 border border-slate-900 focus:border-purple-500/50 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-650 focus:outline-none transition-colors"
              />
              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm px-5 py-2.5 rounded-xl transition-all duration-300 shadow-md shadow-purple-600/10 cursor-pointer"
              >
                Translate
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right panel: Dynamic Sign Language Output Visualizer */}
      <div className="lg:col-span-6 flex flex-col gap-6">
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 backdrop-blur-sm shadow-xl flex flex-col justify-between flex-1 min-h-[380px]">
          
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-200">Sign Language Output</h2>
            {wordsList.length > 0 && (
              <div className="text-xs font-mono text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-md border border-purple-500/20 font-bold uppercase">
                {isSpellingMode ? 'FINGERSPELLING' : 'WORD SIGN'}
              </div>
            )}
          </div>

          {/* Render output screen container */}
          <div className="bg-slate-950 border border-slate-900 rounded-xl p-8 flex flex-col items-center justify-center flex-1 min-h-[220px] relative overflow-hidden group">
            {/* Background grid dots for tech look */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
            
            {renderSignOutput()}
          </div>

          {/* Media Playback Controls */}
          <div className="border-t border-slate-900 pt-6 mt-6 flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={wordsList.length === 0}
                  className="h-10 px-5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-50 disabled:hover:bg-slate-800 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                >
                  {isPlaying && wordsList.length > 0 ? (
                    <>
                      <span className="h-2 w-2 bg-purple-500 rounded-full animate-ping"></span>
                      Pause Playback
                    </>
                  ) : 'Start Playback'}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setActiveWordIndex(0)
                    setSpellingIndex(0)
                  }}
                  disabled={wordsList.length === 0}
                  className="h-10 w-10 bg-slate-850 hover:bg-slate-800 border border-slate-900 text-slate-400 hover:text-slate-200 disabled:opacity-50 rounded-xl flex items-center justify-center transition-all cursor-pointer"
                  title="Reset Playback"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-medium">Speed:</span>
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                  className="bg-slate-950 border border-slate-900 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
                >
                  <option value="0.5">0.5x</option>
                  <option value="1.0">1.0x (Normal)</option>
                  <option value="1.5">1.5x</option>
                  <option value="2.0">2.0x</option>
                </select>
              </div>
            </div>

            {/* Source text display details */}
            <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3 text-[11px] text-slate-500">
              <strong>Spoken Transcript:</strong> <span className="text-slate-300 font-medium">"{recognizedText}"</span>
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}

export default SpeakToSign
