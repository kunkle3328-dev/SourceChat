import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mic, Square, Loader2, Volume2, VolumeX, Globe, Database, ShieldAlert, Maximize2, Minimize2 } from 'lucide-react';
import { Message, Source, VoiceModeState } from '../types';
import { cn } from '../lib/utils';
import { ai } from '../lib/gemini';
import { AudioStreamPlayer, AudioRecorder } from '../lib/live-audio';
import { LiveServerMessage, Modality } from '@google/genai';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: (summary?: string, transcript?: string[]) => void;
  onStartNewChat: () => void;
  selectedMessage: Message;
  chatHistory: Message[];
  sources: Source[];
}

const VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];

// Helper to strip URLs from text so the AI doesn't read them out loud
function stripUrls(text: string): string {
  if (!text) return '';
  return text.replace(/https?:\/\/[^\s]+/g, 'a link');
}

export const VoiceModal: React.FC<VoiceModalProps> = ({
  isOpen,
  onClose,
  onStartNewChat,
  selectedMessage,
  chatHistory,
  sources
}) => {
  const [state, setState] = useState<VoiceModeState>(VoiceModeState.IDLE);
  const [hasStarted, setHasStarted] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [showCaptions, setShowCaptions] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState('Puck');
  const [showPrivacy, setShowPrivacy] = useState(false);
  
  const [isMinimized, setIsMinimized] = useState(false);
  
  const [webSearchAllowed, setWebSearchAllowed] = useState(true);
  const [useSourcesOnly, setUseSourcesOnly] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const [sessionTranscript, setSessionTranscript] = useState<string[]>([]);
  const captionsEndRef = useRef<HTMLDivElement>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playerRef = useRef<AudioStreamPlayer | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const sessionRef = useRef<any>(null);

  useEffect(() => {
    if (showCaptions && captionsEndRef.current) {
      captionsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sessionTranscript, transcript, showCaptions]);

  const stopAll = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    if (playerRef.current) {
      playerRef.current.stop();
      playerRef.current = null;
    }
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
  }, []);

  const startSession = useCallback(async () => {
    setHasStarted(true);
    setState(VoiceModeState.CONNECTING);
    setSessionTranscript([]);
    setTranscript('');

    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      playerRef.current = new AudioStreamPlayer(audioContextRef.current);
      recorderRef.current = new AudioRecorder(audioContextRef.current);

      const systemInstruction = `You are a helpful, conversational AI assistant. You are currently in a live voice session with the user.
Keep your responses concise, natural, and conversational. Do not read out long URLs or complex markdown formatting.
The user is asking about this specific message: "${stripUrls(selectedMessage?.text || '')}".
Start by briefly acknowledging the message and asking if they have any follow-up questions.`;

      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
          },
          systemInstruction,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: async () => {
            setState(VoiceModeState.LISTENING);
            if (recorderRef.current) {
              await recorderRef.current.start((base64Data) => {
                if (!isMuted) {
                  sessionPromise.then((session) => {
                    session.sendRealtimeInput({
                      audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                    });
                  });
                }
              });
            }
          },
          onmessage: (message: LiveServerMessage) => {
            // Handle audio output
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && playerRef.current) {
              setState(VoiceModeState.SPEAKING);
              playerRef.current.playChunk(base64Audio);
            }

            // Handle interruption
            if (message.serverContent?.interrupted && playerRef.current) {
              playerRef.current.stop();
              setState(VoiceModeState.LISTENING);
            }

            // Handle transcription
            const modelText = message.serverContent?.modelTurn?.parts[0]?.text;
            if (modelText) {
              setSessionTranscript(prev => [...prev, `AI: ${modelText}`]);
              setState(VoiceModeState.LISTENING);
            }
          },
          onclose: () => {
            setState(VoiceModeState.IDLE);
            stopAll();
          },
          onerror: (error) => {
            console.error("Live API Error:", error);
            setState(VoiceModeState.IDLE);
            stopAll();
          }
        }
      });

      sessionRef.current = await sessionPromise;

    } catch (error) {
      console.error("Failed to start live session:", error);
      setState(VoiceModeState.IDLE);
      stopAll();
    }
  }, [selectedMessage?.text, selectedVoice, isMuted, stopAll]);

  useEffect(() => {
    if (isOpen) {
      setState(VoiceModeState.IDLE);
      setHasStarted(false);
      setSessionTranscript([]);
    } else {
      stopAll();
      setState(VoiceModeState.IDLE);
    }
    return () => stopAll();
  }, [isOpen, stopAll]);

  const handleEndSession = (action: 'close' | 'continue' | 'new') => {
    stopAll();
    setState(VoiceModeState.ENDING);
    
    const summary = sessionTranscript.length > 0 
      ? `**Topic Discussed:**\n> ${selectedMessage?.text?.substring(0, 150) || ''}...\n\n**Session Details:**\n- Live voice session completed.`
      : undefined;

    if (action === 'new') {
      onStartNewChat();
    } else {
      onClose(summary, sessionTranscript);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ 
          y: 0,
          height: isMinimized ? '80px' : '85dvh',
        }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className={cn(
          "fixed inset-x-0 bottom-0 z-[150] glass-panel-heavy rounded-t-[2.5rem] shadow-[0_-30px_80px_rgba(0,0,0,0.9)] border-t border-white/10 flex flex-col overflow-hidden transition-all duration-500",
          isMinimized ? "rounded-t-3xl" : "sm:h-[75dvh] sm:inset-x-4 sm:bottom-4 sm:rounded-[3rem] sm:border"
        )}
      >
        {/* Drag Handle / Minimize Trigger */}
        <div 
          className="w-full flex flex-col items-center pt-3 pb-2 cursor-pointer group relative"
          onClick={() => setIsMinimized(!isMinimized)}
        >
          <div className="w-12 h-1.5 rounded-full bg-white/10 group-hover:bg-white/30 transition-all duration-300" />
          <div className="absolute right-6 top-3 text-[var(--glass-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </div>
          {isMinimized && (
            <span className="text-[7px] font-black text-[var(--glass-accent)] uppercase tracking-[0.3em] mt-1.5 animate-pulse">
              Tap to expand session
            </span>
          )}
        </div>

        {isMinimized ? (
          /* Minimized Mini-Player UI */
          <div className="px-6 h-full flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                <motion.div
                  animate={{
                    scale: state === VoiceModeState.SPEAKING ? [1, 1.2, 1] : 1,
                    opacity: state === VoiceModeState.LISTENING ? [0.4, 0.8, 0.4] : 0.6,
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={cn(
                    "absolute inset-0 rounded-full blur-xl",
                    state === VoiceModeState.LISTENING ? "bg-emerald-500/40" : 
                    state === VoiceModeState.SPEAKING ? "bg-[var(--glass-accent)]/40" : "bg-blue-500/20"
                  )}
                />
                <div className="relative z-10 w-8 h-8 glass-panel-heavy rounded-full flex items-center justify-center border border-white/10">
                  {state === VoiceModeState.SPEAKING ? <Volume2 className="w-4 h-4 text-[var(--glass-accent)]" /> : <Mic className="w-4 h-4 text-emerald-400" />}
                </div>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-[var(--glass-text)] truncate">
                  {state === VoiceModeState.SPEAKING ? "AI is speaking..." : state === VoiceModeState.LISTENING ? "Listening..." : "Live AI Session"}
                </span>
                <span className="text-[9px] font-bold text-[var(--glass-text-muted)] uppercase tracking-widest truncate">
                  {selectedMessage?.text?.substring(0, 30)}...
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                className={cn("w-9 h-9 glass-icon-btn", isMuted ? "text-red-400" : "text-[var(--glass-text-muted)]")}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleEndSession('close'); }}
                className="w-9 h-9 glass-icon-btn text-red-400/80 hover:text-red-400"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            </div>
          </div>
        ) : (
          /* Full Modal UI */
          <>
            {/* Header */}
            <div className="px-6 sm:px-10 py-2 sm:py-4 flex items-center justify-between shrink-0">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--glass-accent)] animate-pulse shadow-[0_0_12px_var(--glass-accent)]" />
                  <h3 className="text-lg sm:text-2xl font-black text-[var(--glass-text)] tracking-tighter uppercase italic">
                    Live Session
                  </h3>
                </div>
                <p className="text-[9px] font-bold text-[var(--glass-text-muted)] uppercase tracking-[0.3em] truncate opacity-60">
                  {selectedMessage?.text?.substring(0, 50) || ''}...
                </p>
              </div>
              <button 
                onClick={() => handleEndSession('close')}
                className="w-10 h-10 glass-icon-btn text-[var(--glass-text-muted)] hover:text-red-400 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 space-y-6 sm:space-y-10 overflow-y-auto py-6">
              {!hasStarted ? (
                <div className="text-center space-y-8 w-full max-w-sm">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-[var(--glass-accent)]/20 blur-3xl rounded-full group-hover:bg-[var(--glass-accent)]/30 transition-all duration-700" />
                    <div className="relative w-24 h-24 sm:w-32 sm:h-32 glass-panel-heavy rounded-full flex items-center justify-center mx-auto border border-white/10 shadow-2xl">
                      <Mic className="w-10 h-10 sm:w-14 sm:h-14 text-[var(--glass-accent)]" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-2xl sm:text-4xl font-black text-[var(--glass-text)] tracking-tighter uppercase italic">Ready to talk?</h4>
                    <p className="text-sm sm:text-base text-[var(--glass-text-muted)] max-w-xs mx-auto font-medium leading-relaxed">
                      I'll start by reading the response aloud, then we can discuss it live.
                    </p>
                  </div>
                  <button
                    onClick={startSession}
                    className="w-full sm:w-auto px-12 py-5 bg-gradient-to-br from-[var(--glass-accent)] to-[#8B5CF6] text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(var(--glass-accent-rgb),0.4)] hover:scale-105 active:scale-95 transition-all duration-300 text-sm border border-white/20"
                  >
                    Start Live Session
                  </button>
                </div>
              ) : (
                <>
                  {/* Source Status Pill */}
                  <div className="flex items-center gap-3 px-5 py-2 glass-panel-heavy rounded-full shrink-0 border border-white/5">
                    <div className={cn("w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]", useSourcesOnly ? "text-blue-400 bg-blue-400" : webSearchAllowed ? "text-emerald-400 bg-emerald-400" : "text-amber-400 bg-amber-400")} />
                    <span className="text-[10px] font-black text-[var(--glass-text)] uppercase tracking-[0.2em]">
                      {useSourcesOnly ? "Source-Grounded" : webSearchAllowed ? "Hybrid Intelligence" : "Thread Context"}
                    </span>
                  </div>

                  {/* Animated Orb */}
                  <div className="relative w-44 h-44 sm:w-64 sm:h-64 flex items-center justify-center shrink-0">
                    <motion.div
                      animate={{
                        scale: state === VoiceModeState.SPEAKING ? [1, 1.15, 1] : 1,
                        opacity: state === VoiceModeState.LISTENING ? [0.4, 0.9, 0.4] : 0.7,
                      }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                      className={cn(
                        "absolute inset-0 rounded-full blur-[60px] transition-colors duration-700",
                        state === VoiceModeState.LISTENING ? "bg-emerald-500/30" : 
                        state === VoiceModeState.SPEAKING ? "bg-[var(--glass-accent)]/30" : 
                        state === VoiceModeState.CONNECTING ? "bg-amber-500/30" : "bg-blue-500/20"
                      )}
                    />
                    <div className="relative z-10 w-32 h-32 sm:w-44 sm:h-44 glass-panel-heavy rounded-full flex items-center justify-center border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                      {state === VoiceModeState.CONNECTING ? (
                        <Loader2 className="w-12 h-12 sm:w-16 sm:h-16 animate-spin text-[var(--glass-accent)]" />
                      ) : state === VoiceModeState.LISTENING ? (
                        <div className="relative">
                          <Mic className="w-12 h-12 sm:w-16 sm:h-16 text-emerald-400" />
                          <motion.div 
                            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="absolute inset-0 bg-emerald-400 rounded-full -z-10"
                          />
                        </div>
                      ) : (
                        <Volume2 className={cn("w-12 h-12 sm:w-16 sm:h-16 transition-colors duration-500", state === VoiceModeState.SPEAKING ? "text-[var(--glass-accent)]" : "text-[var(--glass-text-muted)]")} />
                      )}
                    </div>
                    
                    {/* Waveform visualizer */}
                    <div className="absolute -bottom-4 flex items-center gap-1.5 h-12">
                      {[...Array(12)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{
                            height: state === VoiceModeState.SPEAKING || state === VoiceModeState.LISTENING ? [6, Math.random() * 40 + 10, 6] : 6
                          }}
                          transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.05 }}
                          className="w-1.5 bg-[var(--glass-accent)] rounded-full opacity-40 shadow-[0_0_10px_var(--glass-accent)]"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Status Text & Captions */}
                  <div className="text-center space-y-6 w-full max-w-lg">
                    <div className="space-y-2">
                      <h4 className="text-xl sm:text-3xl font-black text-[var(--glass-text)] tracking-tighter uppercase italic">
                        {state === VoiceModeState.CONNECTING ? "Syncing..." :
                         state === VoiceModeState.LISTENING ? "Listening..." :
                         state === VoiceModeState.SPEAKING ? "Speaking..." :
                         "Ready"}
                      </h4>
                      <p className="text-[10px] font-bold text-[var(--glass-text-muted)] uppercase tracking-[0.3em] opacity-60">
                        {state === VoiceModeState.CONNECTING ? "Establishing secure link" :
                         state === VoiceModeState.LISTENING ? "Voice activity detected" :
                         state === VoiceModeState.SPEAKING ? "Generating real-time response" :
                         "Waiting for input"}
                      </p>
                    </div>

                    {showCaptions && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-panel-heavy p-5 rounded-[2rem] min-h-[120px] max-h-[180px] overflow-y-auto flex flex-col gap-3 text-left border border-white/5 shadow-inner"
                      >
                        {sessionTranscript.map((line, i) => (
                          <div key={i} className="flex gap-3">
                            <span className={cn("text-[9px] font-black uppercase tracking-widest shrink-0 mt-1", line.startsWith('User:') ? 'text-[var(--glass-accent)]' : 'text-emerald-400')}>
                              {line.startsWith('User:') ? 'You' : 'AI'}
                            </span>
                            <p className="text-xs font-medium leading-relaxed text-[var(--glass-text)] opacity-90">
                              {line.replace(/^(User|AI): /, '')}
                            </p>
                          </div>
                        ))}
                        <div ref={captionsEndRef} />
                      </motion.div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Controls */}
            <div className="px-6 sm:px-10 py-6 sm:py-8 flex flex-col gap-6 bg-black/60 backdrop-blur-2xl border-t border-white/10 shrink-0">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 w-full sm:w-auto">
                  <button 
                    onClick={() => setWebSearchAllowed(!webSearchAllowed)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all border",
                      webSearchAllowed ? "bg-[var(--glass-accent)]/10 border-[var(--glass-accent)]/30 text-[var(--glass-accent)]" : "bg-white/5 border-white/5 text-[var(--glass-text-muted)]"
                    )}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Web {webSearchAllowed ? "ON" : "OFF"}
                  </button>
                  <button 
                    onClick={() => setUseSourcesOnly(!useSourcesOnly)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all border",
                      useSourcesOnly ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : "bg-white/5 border-white/5 text-[var(--glass-text-muted)]"
                    )}
                  >
                    <Database className="w-3.5 h-3.5" />
                    Sources {useSourcesOnly ? "ON" : "OFF"}
                  </button>
                  
                  {/* Voice Selector */}
                  <div className="relative">
                    <select 
                      value={selectedVoice}
                      onChange={(e) => setSelectedVoice(e.target.value)}
                      className="appearance-none bg-white/5 border border-white/5 rounded-2xl pl-4 pr-10 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] text-[var(--glass-text)] outline-none focus:border-[var(--glass-accent)]/30 transition-all cursor-pointer"
                    >
                      {VOICES.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                      <Volume2 className="w-3 h-3" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className={cn("w-12 h-12 glass-icon-btn transition-all duration-300", isMuted ? "bg-red-500/20 text-red-400 border-red-500/30" : "text-[var(--glass-text-muted)]")}
                  >
                    {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                  </button>
                  
                  <div className="relative">
                    <button 
                      onClick={() => setShowPrivacy(!showPrivacy)}
                      className="w-12 h-12 glass-icon-btn text-[var(--glass-text-muted)] hover:text-[var(--glass-accent)]"
                    >
                      <ShieldAlert className="w-6 h-6" />
                    </button>
                    {showPrivacy && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="absolute bottom-20 right-0 w-72 p-5 glass-panel-heavy rounded-[2rem] text-[10px] font-medium leading-relaxed text-[var(--glass-text-muted)] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-20 border border-white/10 backdrop-blur-3xl"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <ShieldAlert className="w-4 h-4 text-[var(--glass-accent)]" />
                          <p className="text-[var(--glass-text)] font-black uppercase tracking-widest text-[9px]">Privacy Protocol</p>
                        </div>
                        Your voice data is streamed securely to Google Gemini for real-time processing and is not stored permanently. You can mute the microphone at any time.
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4">
                <button 
                  onClick={() => handleEndSession('close')}
                  className="flex-1 py-4 glass-panel rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-[var(--glass-text-muted)] hover:text-white hover:bg-white/10 transition-all duration-300 border border-white/5"
                >
                  End Session
                </button>
                <button 
                  onClick={() => handleEndSession('continue')}
                  className="flex-1 py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-white/10 transition-all duration-300 border border-white/10"
                >
                  Continue in Text
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
