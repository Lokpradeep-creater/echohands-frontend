import React, { useState, useEffect, useRef } from 'react'

export const SpeakToSign: React.FC = () => {
  const [micActive, setMicActive] = useState<boolean>(false)
  const [inputText, setInputText] = useState<string>('')
  const [recognizedText, setRecognizedText] = useState<string>('hello everyone')
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0)
  
  // Playlist tracking
  const [activeWordIndex, setActiveWordIndex] = useState<number>(0)
  const [spellingIndex, setSpellingIndex] = useState<number>(0)
  const [isSpellingMode, setIsSpellingMode] = useState<boolean>(false)
  const [isListening, setIsListening] = useState<boolean>(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationRef = useRef<number | null>(null)

  // Split recognized text into words/tokens
  const wordsList = recognizedText.trim().toLowerCase().split(/\s+/).filter(Boolean)

  // Normalize string for dictionary comparison (remove punctuation, lower case)
  const cleanTranscript = recognizedText.toLowerCase().replace(/[?,.!]/g, '').trim()

  // Full-Sentence Dictionaries mapping to premium SVG visualizers
  const sentenceDictionary: Record<string, { label: string; description: string; svg: React.ReactNode }> = {
    'hello everyone': {
      label: 'HELLO EVERYONE',
      description: 'Waving open palm greeting moving across to signify a group.',
      svg: (
        <svg viewBox="0 0 100 100" className="h-28 w-28 text-purple-400">
          <defs>
            <linearGradient id="helloGroupGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          {/* Main Hand */}
          <path
            d="M35 75 C28 75 22 68 25 58 L28 50 C26 48 24 45 25 40 L26 30 C27 28 29 28 30 30 L31 43 L34 25 C35 23 37 23 38 25 L39 43 L42 23 C43 21 45 21 46 23 L47 43 L50 25 C51 23 53 23 54 25 L54 45 L57 33 C58 31 60 32 60 34 L58 52 C56 62 50 75 35 75 Z"
            fill="url(#helloGroupGrad)"
            stroke="#e9d5ff"
            strokeWidth="1.5"
            className="animate-bounce"
            style={{ animationDuration: '2s' }}
          />
          {/* Sub-groups/heads in background */}
          <circle cx="70" cy="45" r="7" fill="#475569" />
          <circle cx="85" cy="50" r="7" fill="#475569" />
          <circle cx="78" cy="62" r="7" fill="#334155" />
          {/* Motion lines */}
          <path d="M12 40 C10 44 10 50 12 54" stroke="#10b981" strokeWidth="2" strokeLinecap="round" fill="none" className="animate-pulse" />
          <path d="M50 35 C53 38 53 43 50 46" stroke="#10b981" strokeWidth="2" strokeLinecap="round" fill="none" className="animate-pulse" />
        </svg>
      )
    },
    'how are you': {
      label: 'HOW ARE YOU?',
      description: 'Hands cupped turning upward, then index finger pointing forward.',
      svg: (
        <svg viewBox="0 0 100 100" className="h-28 w-28 text-indigo-400">
          <defs>
            <linearGradient id="howGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          {/* Left hand cupped */}
          <path d="M25 60 C15 60 18 45 28 48 C32 50 34 55 33 58 Z" fill="url(#howGrad)" stroke="#c084fc" strokeWidth="1.5" />
          {/* Right hand pointing forward */}
          <path d="M50 55 L70 50 C74 49 76 53 74 56 L55 65 Z" fill="url(#howGrad)" stroke="#c084fc" strokeWidth="1.5" className="animate-pulse" />
          {/* Question mark node */}
          <circle cx="50" cy="25" r="5" fill="#a855f7" />
          <path d="M47 12 C47 5 53 5 53 12 C53 16 50 18 50 20" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )
    },
    'thank you': {
      label: 'THANK YOU',
      description: 'Flat open hand moving forward and down from the lips.',
      svg: (
        <svg viewBox="0 0 100 100" className="h-28 w-28 text-blue-400">
          <defs>
            <linearGradient id="thankSentenceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
          </defs>
          {/* Waving hand moving out */}
          <path
            d="M30 50 C40 45 50 45 60 48 L78 52 C82 53 84 57 82 60 L72 67 C62 72 48 72 38 67 Z"
            fill="url(#thankSentenceGrad)"
            stroke="#93c5fd"
            strokeWidth="1.5"
            className="animate-bounce"
            style={{ animationDuration: '1.5s' }}
          />
          {/* Action indicator lines */}
          <path d="M35 40 Q55 32 72 45" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3,3" />
          <path d="M68 40 L73 45 L66 47" fill="none" stroke="#10b981" strokeWidth="2" />
        </svg>
      )
    },
    'had your breakfast': {
      label: 'HAD YOUR BREAKFAST?',
      description: 'Hand moving to mouth representing eating, followed by the shaka signature shape.',
      svg: (
        <svg viewBox="0 0 100 100" className="h-28 w-28 text-emerald-400">
          <defs>
            <linearGradient id="bfastGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          {/* Hand bringing food to mouth */}
          <path d="M22 65 C22 55 35 48 40 55 L32 68 C28 72 24 72 22 65 Z" fill="url(#bfastGrad)" stroke="#6ee7b7" strokeWidth="1.5" />
          {/* Shaka sign */}
          <path d="M55 50 L75 52 C78 52 80 48 77 46 L60 40 L52 48 Z" fill="url(#bfastGrad)" stroke="#6ee7b7" strokeWidth="1.5" className="animate-pulse" />
          {/* Cup/Bowl outline */}
          <path d="M72 75 C60 75 58 65 72 65 C85 65 85 75 72 75 Z" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    },
    'what is your name': {
      label: 'WHAT IS YOUR NAME?',
      description: 'Index finger tracing a vertical line, followed by palms open questioning.',
      svg: (
        <svg viewBox="0 0 100 100" className="h-28 w-28 text-amber-400">
          <defs>
            <linearGradient id="nameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          {/* Flat palms held up questioning */}
          <path d="M22 55 C22 45 35 48 33 58 Z" fill="url(#nameGrad)" stroke="#fcd34d" strokeWidth="1.5" />
          <path d="M78 55 C78 45 65 48 67 58 Z" fill="url(#nameGrad)" stroke="#fcd34d" strokeWidth="1.5" />
          {/* Index drawing trace */}
          <path d="M50 45 L50 25" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
          <circle cx="50" cy="55" r="3" fill="#10b981" />
        </svg>
      )
    }
  }

  // Playback timer loop to step through words list or spelling letters
  useEffect(() => {
    if (!isPlaying || wordsList.length === 0) return

    // If the full sentence is in our dictionary, we don't need word-by-word spelling
    if (cleanTranscript in sentenceDictionary) {
      setIsSpellingMode(false)
      return
    }

    const stepInterval = 1500 / playbackSpeed
    const timer = setInterval(() => {
      const activeWord = wordsList[activeWordIndex]
      
      // Unknown phrase -> spell out word-by-word or letter-by-letter
      setIsSpellingMode(true)
      if (spellingIndex < activeWord.length - 1) {
        setSpellingIndex((prev) => prev + 1)
      } else {
        setSpellingIndex(0)
        setIsSpellingMode(false)
        setActiveWordIndex((prev) => (prev + 1) % wordsList.length)
      }
    }, stepInterval)

    return () => clearInterval(timer)
  }, [isPlaying, activeWordIndex, spellingIndex, wordsList, playbackSpeed, cleanTranscript])

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

    // Simulate audio recognition of target sentences
    const targetSentencesList = [
      'hello everyone',
      'how are you?',
      'thank you',
      'had your breakfast?',
      'what is your name?'
    ]
    setTimeout(() => {
      const randomSentence = targetSentencesList[Math.floor(Math.random() * targetSentencesList.length)]
      setRecognizedText(randomSentence)
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
          <p className="text-[11px] text-slate-600 mt-1 max-w-[220px]">Speak or type one of the 5 targeted phrases to view its specific gesture representation.</p>
        </div>
      )
    }

    // 1. Direct Sentence Match (highest priority)
    const sentenceMatch = sentenceDictionary[cleanTranscript]
    if (sentenceMatch) {
      return (
        <div className="flex flex-col items-center justify-center p-4 text-center">
          {sentenceMatch.svg}
          <h3 className="text-white font-bold text-lg mt-4 uppercase tracking-wider">{sentenceMatch.label}</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-[280px]">{sentenceMatch.description}</p>
        </div>
      )
    }

    // 2. Fallback: spell out letters of words sequentially
    const currentWord = wordsList[activeWordIndex]
    const letter = currentWord[spellingIndex]?.toUpperCase()
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center">
        <div className="h-28 w-28 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(168,85,247,0.02)_1px,transparent_1px)] bg-[size:100%_4px]" />
          <span className="text-5xl font-extrabold text-purple-400 font-mono tracking-tighter">
            {letter}
          </span>
        </div>
        <h3 className="text-white font-bold text-lg mt-4 uppercase tracking-wider">SPELLING: "{currentWord.toUpperCase()}"</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
          Phrase not in dictionary. Spelling letter <strong className="text-purple-400 font-mono text-sm">"{letter}"</strong>.
        </p>
      </div>
    )
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
                    {isListening ? 'Speak a phrase now...' : 'Tap the microphone to convert spoken voice to sign language.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Manual text form */}
          <form onSubmit={handleTextSubmit} className="flex flex-col gap-3">
            <label className="text-xs text-slate-400 font-medium">Or type manually to translate</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type e.g., hello everyone, how are you?, thank you..."
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

        {/* target list info cheatsheet */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 backdrop-blur-sm shadow-xl flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Recognized Sentence Dictionary</h3>
          <ul className="text-xs text-slate-500 flex flex-col gap-1.5 font-mono list-disc pl-4">
            <li>"hello everyone"</li>
            <li>"how are you?"</li>
            <li>"thank you"</li>
            <li>"had your breakfast?"</li>
            <li>"what is your name?"</li>
          </ul>
        </div>
      </div>

      {/* Right panel: Dynamic Sign Language Output Visualizer */}
      <div className="lg:col-span-6 flex flex-col gap-6">
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 backdrop-blur-sm shadow-xl flex flex-col justify-between flex-1 min-h-[380px]">
          
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-200">Sign Language Output</h2>
            {wordsList.length > 0 && (
              <div className="text-xs font-mono text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-md border border-purple-500/20 font-bold uppercase">
                {isSpellingMode ? 'FINGERSPELLING' : 'SENTENCE SIGN'}
              </div>
            )}
          </div>

          {/* Render output screen container */}
          <div className="bg-slate-950 border border-slate-900 rounded-xl p-8 flex flex-col items-center justify-center flex-1 min-h-[220px] relative overflow-hidden group">
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
