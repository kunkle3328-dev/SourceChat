import React, { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Source, Message, Notebook, VoiceModeState } from './types';
import { chatWithSourcesStream, summarizeSource } from './lib/gemini';
import { cn } from './lib/utils';
import { 
  Menu, X, Upload, FileText, Trash2, Send, 
  Bot, User, Paperclip, Loader2, File, FileImage, FileAudio, FileVideo, Link as LinkIcon, Plus, Info, ExternalLink, Sparkles, Book, CheckCircle2, Circle, Mic, MessageSquare
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';
import { VoiceModal } from './components/VoiceModal';
import { AdvancedLoadingState } from './components/AdvancedLoadingState';

const SourceModal = ({ source, onClose }: { source: Source; onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'preview'>('summary');
  if (!source) return null;

  const isTextSource = source.type.startsWith('text/') || 
                       source.type === 'application/json' || 
                       source.type === 'application/javascript' ||
                       source.name.endsWith('.md') ||
                       source.name.endsWith('.txt');

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="glass-panel-heavy rounded-3xl sm:rounded-[2.5rem] w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-[var(--glass-border)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 pb-2 sm:pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 glass-panel-heavy rounded-xl sm:rounded-2xl flex items-center justify-center text-[var(--glass-accent)]">
              {source.type === 'url' ? <LinkIcon className="w-5 h-5 sm:w-6 sm:h-6" /> : <FileText className="w-5 h-5 sm:w-6 sm:h-6" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-[var(--glass-text)] truncate max-w-[200px] sm:max-w-[300px] tracking-tight">{source.name}</h3>
              <p className="text-[9px] sm:text-[10px] font-bold text-[var(--glass-text-muted)] uppercase tracking-widest truncate">
                {source.type === 'url' ? 'Web Intelligence' : `Document Context • ${source.type.split('/')[1] || source.type}`}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 shrink-0 glass-icon-btn text-[var(--glass-text-muted)] hover:text-[var(--glass-text)] ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 sm:px-6 gap-4 sm:gap-6">
          <button 
            onClick={() => setActiveTab('summary')}
            className={cn(
              "pb-3 text-sm font-bold uppercase tracking-widest transition-all border-b-2",
              activeTab === 'summary' ? "text-[var(--glass-accent)] border-[var(--glass-accent)]" : "text-[var(--glass-text-muted)] border-transparent hover:text-[var(--glass-text)]"
            )}
          >
            Executive Summary
          </button>
          {isTextSource && source.data && (
            <button 
              onClick={() => setActiveTab('preview')}
              className={cn(
                "pb-3 text-sm font-bold uppercase tracking-widest transition-all border-b-2",
                activeTab === 'preview' ? "text-[var(--glass-accent)] border-[var(--glass-accent)]" : "text-[var(--glass-text-muted)] border-transparent hover:text-[var(--glass-text)]"
              )}
            >
              Raw Content
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-8 space-y-6 sm:space-y-8 glass-panel-heavy rounded-2xl sm:rounded-3xl mx-2 sm:mx-4 mb-2 sm:mb-4">
          {activeTab === 'summary' ? (
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-[var(--glass-accent)]">
                <Sparkles className="w-5 h-5" />
                <h4 className="text-xs font-bold uppercase tracking-[0.2em]">Neural Synthesis</h4>
              </div>
              <div className="glass-panel rounded-2xl sm:rounded-3xl p-3 sm:p-8 prose prose-invert prose-p:leading-relaxed prose-headings:text-[var(--glass-text)] prose-strong:text-[var(--glass-accent)] max-w-none text-sm sm:text-base text-[var(--glass-text)]">
                {source.isSummarizing ? (
                  <div className="flex flex-col items-center justify-center py-8 sm:py-12">
                    <AdvancedLoadingState />
                  </div>
                ) : source.summary ? (
                  <Markdown remarkPlugins={[remarkGfm]}>{source.summary}</Markdown>
                ) : (
                  <div className="text-center py-8 sm:py-12">
                    <Info className="w-10 h-10 text-[var(--glass-text-muted)] mx-auto mb-4" />
                    <p className="text-[var(--glass-text-muted)] italic">No intelligence summary available for this source.</p>
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className="space-y-4 h-full">
              <div className="flex items-center gap-2 text-[var(--glass-text-muted)]">
                <FileText className="w-5 h-5" />
                <h4 className="text-xs font-bold uppercase tracking-[0.2em]">Source Preview</h4>
              </div>
              <div className="glass-panel rounded-2xl sm:rounded-3xl p-3 sm:p-6 font-mono text-[10px] sm:text-xs text-[var(--glass-text-muted)] overflow-auto max-h-[400px] leading-relaxed">
                <pre className="whitespace-pre-wrap">
                  {(() => {
                    try {
                      const binary = atob(source.data || '');
                      const bytes = new Uint8Array(binary.length);
                      for (let i = 0; i < binary.length; i++) {
                        bytes[i] = binary.charCodeAt(i);
                      }
                      return new TextDecoder().decode(bytes);
                    } catch (e) {
                      return "Unable to preview content.";
                    }
                  })()}
                </pre>
              </div>
            </section>
          )}

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 sm:p-5 glass-panel rounded-2xl flex flex-col gap-1">
              <p className="text-[10px] text-[var(--glass-text-muted)] uppercase font-bold tracking-widest">Ingestion Date</p>
              <p className="text-sm font-medium text-[var(--glass-text)]">{new Date(source.createdAt).toLocaleString()}</p>
            </div>
            {source.size && (
              <div className="p-4 sm:p-5 glass-panel rounded-2xl flex flex-col gap-1">
                <p className="text-[10px] text-[var(--glass-text-muted)] uppercase font-bold tracking-widest">Data Volume</p>
                <p className="text-sm font-medium text-[var(--glass-text)]">{(source.size / 1024).toFixed(1)} KB</p>
              </div>
            )}
            {source.url && (
              <div className="sm:col-span-2 p-4 sm:p-5 glass-panel rounded-2xl flex flex-col gap-2">
                <p className="text-[10px] text-[var(--glass-text-muted)] uppercase font-bold tracking-widest">Origin URL</p>
                <a 
                  href={source.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--glass-accent)] hover:underline flex items-center gap-2 truncate transition-colors group"
                >
                  <span className="truncate">{source.url}</span>
                  <ExternalLink className="w-4 h-4 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </div>
            )}
          </section>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function App() {
  const [notebooks, setNotebooks] = useState<Notebook[]>(() => {
    const saved = localStorage.getItem('sourcechat_notebooks');
    return saved ? JSON.parse(saved) : [
      { id: 'default', name: 'General Research', createdAt: Date.now() }
    ];
  });
  const [activeNotebookId, setActiveNotebookId] = useState<string>(() => {
    return localStorage.getItem('sourcechat_active_notebook_id') || 'default';
  });
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');

  const [sources, setSources] = useState<Source[]>(() => {
    const saved = localStorage.getItem('sourcechat_sources');
    return saved ? JSON.parse(saved) : [];
  });
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('sourcechat_messages');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [voiceSelectedMessage, setVoiceSelectedMessage] = useState<Message | null>(null);
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeNotebook = notebooks.find(n => n.id === activeNotebookId) || notebooks[0];
  const activeSources = sources.filter(s => (s.notebookId || 'default') === activeNotebookId);
  const activeMessages = messages.filter(m => (m.notebookId || 'default') === activeNotebookId);

  useEffect(() => {
    localStorage.setItem('sourcechat_notebooks', JSON.stringify(notebooks));
  }, [notebooks]);

  useEffect(() => {
    localStorage.setItem('sourcechat_active_notebook_id', activeNotebookId);
  }, [activeNotebookId]);

  useEffect(() => {
    localStorage.setItem('sourcechat_sources', JSON.stringify(sources));
  }, [sources]);

  useEffect(() => {
    localStorage.setItem('sourcechat_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  useEffect(() => {
    const checkMicPermission = async () => {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as any });
        setMicPermission(result.state);
        result.onchange = () => setMicPermission(result.state);
      } catch (e) {
        console.warn("Permissions API not supported for microphone check");
      }
    };
    checkMicPermission();
  }, []);

  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicPermission('granted');
    } catch (e) {
      setMicPermission('denied');
      console.error("Mic permission denied:", e);
    }
  };

  const triggerSummarization = useCallback(async (source: Source) => {
    const timeoutId = setTimeout(() => {
      setSources(prev => prev.map(s => {
        if (s.id === source.id && s.isSummarizing) {
          console.warn("Summarization safety timeout triggered for:", s.name);
          return { ...s, isSummarizing: false, summary: "Summarization is taking longer than expected. You can still use this source in chat." };
        }
        return s;
      }));
    }, 130000);

    try {
      setSources(prev => prev.map(s => s.id === source.id ? { ...s, isSummarizing: true } : s));
      const summary = await summarizeSource(source);
      clearTimeout(timeoutId);
      setSources(prev => prev.map(s => s.id === source.id ? { ...s, summary, isSummarizing: false } : s));
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("Summarization Error:", error);
      setSources(prev => prev.map(s => s.id === source.id ? { ...s, isSummarizing: false, summary: "Failed to generate summary. Please try again." } : s));
    }
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const id = uuidv4();
      const newSource: Source = {
        id,
        notebookId: activeNotebookId,
        isActive: true,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        createdAt: Date.now(),
        status: 'uploading',
        progress: 0
      };

      setSources(prev => [...prev, newSource]);

      const reader = new FileReader();

      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setSources(prev => prev.map(s => s.id === id ? { ...s, progress } : s));
        }
      };

      reader.onload = async (event) => {
        const result = event.target?.result as string;
        if (!result) {
          setSources(prev => prev.map(s => s.id === id ? { ...s, status: 'error', errorText: 'Failed to read file' } : s));
          return;
        }
        
        const match = result.match(/^data:(.*);base64,(.*)$/);
        if (!match) {
          setSources(prev => prev.map(s => s.id === id ? { ...s, status: 'error', errorText: 'Invalid file format' } : s));
          return;
        }
        
        let type = match[1];
        const data = match[2];
        
        if (!type || type === 'application/octet-stream') {
          if (file.name.endsWith('.md')) type = 'text/markdown';
          else if (file.name.endsWith('.txt')) type = 'text/plain';
          else if (file.name.endsWith('.csv')) type = 'text/csv';
          else if (file.name.endsWith('.json')) type = 'application/json';
        }
        
        const updatedSource: Source = { ...newSource, status: 'ready', progress: 100, type, data };
        setSources(prev => prev.map(s => s.id === id ? updatedSource : s));
        
        // Auto-summarize
        triggerSummarization(updatedSource);
      };

      reader.onerror = () => {
        setSources(prev => prev.map(s => s.id === id ? { ...s, status: 'error', errorText: 'Error reading file' } : s));
      };

      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;

    let url = linkUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const newSource: Source = {
      id: uuidv4(),
      notebookId: activeNotebookId,
      isActive: true,
      name: url,
      type: 'url',
      url: url,
      createdAt: Date.now(),
      status: 'ready',
      progress: 100
    };

    setSources(prev => [...prev, newSource]);
    setLinkUrl('');
    setIsAddingLink(false);
    
    // Auto-summarize
    triggerSummarization(newSource);
  };

  const removeSource = (id: string) => {
    setSources(prev => prev.filter(s => s.id !== id));
    if (selectedSource?.id === id) setSelectedSource(null);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string) => {
    if (type === 'url') return <LinkIcon className="w-4 h-4" />;
    if (type.startsWith('image/')) return <FileImage className="w-4 h-4" />;
    if (type.startsWith('audio/')) return <FileAudio className="w-4 h-4" />;
    if (type.startsWith('video/')) return <FileVideo className="w-4 h-4" />;
    if (type === 'application/pdf') return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: uuidv4(),
      notebookId: activeNotebookId,
      role: 'user',
      text: input.trim(),
      createdAt: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const modelMessageId = uuidv4();
    setMessages(prev => [
      ...prev,
      {
        id: modelMessageId,
        notebookId: activeNotebookId,
        role: 'model',
        text: '',
        createdAt: Date.now()
      }
    ]);

    const safetyTimeoutId = setTimeout(() => {
      setIsLoading(prev => {
        if (prev) {
          setMessages(msgs => msgs.map(msg => {
            if (msg.id === modelMessageId && !msg.text) {
              return { ...msg, text: "**System Error:** The request is taking too long. This can happen with very large documents or complex web pages. Please try a shorter query or check your connection." };
            }
            return msg;
          }));
          return false;
        }
        return prev;
      });
    }, 130000);

    try {
      await chatWithSourcesStream(
        [...activeMessages, userMessage],
        activeSources.filter(s => s.isActive !== false),
        (chunkText) => {
          setMessages(prev => prev.map(msg => {
            if (msg.id === modelMessageId) {
              return { ...msg, text: msg.text + chunkText };
            }
            return msg;
          }));
        }
      );
      clearTimeout(safetyTimeoutId);
    } catch (error) {
      clearTimeout(safetyTimeoutId);
      console.error("Chat error:", error);
      setMessages(prev => prev.map(msg => {
        if (msg.id === modelMessageId) {
          return { ...msg, text: msg.text + "\n\n**System Error:** We encountered an issue processing your request. Please ensure your sources are valid and try again." };
        }
        return msg;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceFollowUp = (msg: Message) => {
    setVoiceSelectedMessage(msg);
    setIsVoiceModalOpen(true);
  };

  const handleVoiceModalClose = (summary?: string, transcript?: string[]) => {
    setIsVoiceModalOpen(false);
    if (summary) {
      const summaryMessage: Message = {
        id: uuidv4(),
        notebookId: activeNotebookId,
        role: 'model',
        text: `${summary}\n\n*You can continue the conversation here in text or start another live session.*`,
        createdAt: Date.now(),
        isVoiceSummary: true,
        voiceTranscript: transcript
      };
      setMessages(prev => [...prev, summaryMessage]);
    }
    setVoiceSelectedMessage(null);
  };

  const handleStartNewChat = () => {
    const newNb = { 
      id: uuidv4(), 
      name: `New Chat ${notebooks.length + 1}`, 
      createdAt: Date.now() 
    };
    setNotebooks(prev => [...prev, newNb]);
    setActiveNotebookId(newNb.id);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-transparent text-[var(--glass-text)] font-sans overflow-hidden selection:bg-[var(--glass-accent)]/30">
      <AnimatePresence>
        {selectedSource && (
          <SourceModal 
            source={selectedSource} 
            onClose={() => setSelectedSource(null)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isVoiceModalOpen && voiceSelectedMessage && (
          <VoiceModal
            isOpen={isVoiceModalOpen}
            onClose={handleVoiceModalClose}
            onStartNewChat={handleStartNewChat}
            selectedMessage={voiceSelectedMessage}
            chatHistory={activeMessages}
            sources={activeSources}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar / Bottom Sheet */}
      <div className={cn(
        "fixed z-50 flex flex-col transition-transform duration-300 ease-in-out glass-panel-heavy",
        // Mobile (Bottom Sheet)
        "inset-x-0 top-[10dvh] bottom-0 w-full pb-[env(safe-area-inset-bottom,20px)] rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] lg:shadow-none",
        isSidebarOpen ? "translate-y-0" : "translate-y-full",
        // Desktop (Sidebar)
        "lg:top-0 lg:inset-y-0 lg:left-0 lg:w-80 lg:h-full lg:rounded-none lg:translate-y-0 lg:translate-x-0 lg:border-r lg:border-[var(--glass-border)]"
      )}>
        {/* Drag Handle for Mobile */}
        <div className="w-full flex justify-center pt-4 pb-2 lg:hidden" onClick={() => setIsSidebarOpen(false)}>
          <div className="w-12 h-1.5 rounded-full bg-[var(--glass-text-muted)]/30" />
        </div>

        <div className="p-4 sm:p-6 pb-2 sm:pb-4 flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 glass-panel rounded-xl text-[var(--glass-accent)]">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            SourceChat
          </h1>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden w-10 h-10 glass-icon-btn text-[var(--glass-text-muted)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-4 flex flex-col gap-4 sm:gap-6">
          {/* Add Source Section (Moved to top for mobile visibility) */}
          <div className="space-y-3 sm:space-y-4 flex flex-col min-h-0 px-1">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[var(--glass-text-muted)] uppercase tracking-[0.2em] truncate pr-2">
                Sources in {activeNotebook.name}
              </h2>
              <span className="text-[10px] font-bold glass-panel-heavy text-[var(--glass-text-muted)] px-2 py-1 rounded-lg shrink-0">
                {activeSources.length}
              </span>
            </div>

            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 glass-button py-2.5 sm:py-3 px-3 rounded-2xl text-sm font-semibold text-[var(--glass-text-muted)] hover:text-[var(--glass-text)]"
              >
                <Upload className="w-4 h-4" />
                File
              </button>
              <button
                onClick={() => setIsAddingLink(!isAddingLink)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 px-3 rounded-2xl text-sm font-semibold transition-all",
                  isAddingLink 
                    ? "glass-panel-heavy text-[var(--glass-accent)]" 
                    : "glass-button text-[var(--glass-text-muted)] hover:text-[var(--glass-text)]"
                )}
              >
                <LinkIcon className="w-4 h-4" />
                Link
              </button>
            </div>

            <AnimatePresence>
              {isAddingLink && (
                <motion.form 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onSubmit={handleAddLink} 
                  className="flex gap-3 overflow-hidden pt-2"
                >
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={e => setLinkUrl(e.target.value)}
                    placeholder="Paste website URL..."
                    className="flex-1 glass-input rounded-xl px-3 py-2 sm:px-4 sm:py-3 text-sm bg-black/50 border border-white/10"
                    autoFocus
                  />
                  <button 
                    type="submit" 
                    disabled={!linkUrl.trim()}
                    className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 glass-icon-btn text-[var(--glass-accent)] disabled:opacity-50 disabled:text-[var(--glass-text-muted)] bg-black/50 border border-white/10"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* Notebooks Section */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold text-[var(--glass-text-muted)] uppercase tracking-[0.2em]">Notebooks</h2>
              <button
                onClick={() => setIsCreatingNotebook(true)}
                className="w-8 h-8 glass-icon-btn text-[var(--glass-text-muted)] hover:text-[var(--glass-accent)]"
                title="Create Notebook"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 sm:space-y-3 max-h-[25vh] sm:max-h-[30vh] overflow-y-auto px-1 pb-2">
              {notebooks.map(nb => (
                <button
                  key={nb.id}
                  onClick={() => setActiveNotebookId(nb.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-sm font-medium transition-all",
                    activeNotebookId === nb.id
                      ? "glass-panel-heavy text-[var(--glass-accent)]"
                      : "glass-panel text-[var(--glass-text-muted)] hover:text-[var(--glass-text)]"
                  )}
                >
                  <Book className="w-4 h-4 shrink-0" />
                  <span className="truncate">{nb.name}</span>
                </button>
              ))}

              <AnimatePresence>
                {isCreatingNotebook && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (newNotebookName.trim()) {
                        const newNb = { id: uuidv4(), name: newNotebookName.trim(), createdAt: Date.now() };
                        setNotebooks(prev => [...prev, newNb]);
                        setActiveNotebookId(newNb.id);
                        setNewNotebookName('');
                        setIsCreatingNotebook(false);
                      }
                    }}
                    className="flex items-center gap-2 mt-3"
                  >
                    <input
                      autoFocus
                      value={newNotebookName}
                      onChange={e => setNewNotebookName(e.target.value)}
                      placeholder="Notebook name..."
                      className="flex-1 glass-input rounded-xl px-3 py-2 sm:px-4 sm:py-3 text-sm"
                      onBlur={() => {
                        if (!newNotebookName.trim()) setIsCreatingNotebook(false);
                      }}
                    />
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            multiple
            accept=".pdf,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.webp"
          />

          <div className="space-y-3 sm:space-y-4 flex-1 flex flex-col min-h-0 px-1">
            {/* Sources List Section */}
            <div className="space-y-4 overflow-y-auto flex-1 px-1 pb-4">
            {activeSources.length === 0 ? (
              <div className="text-center py-6 sm:py-12 px-3 sm:px-4 text-[var(--glass-text-muted)] text-sm glass-panel-heavy rounded-2xl sm:rounded-3xl">
                <div className="w-10 h-10 sm:w-12 sm:h-12 glass-panel rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Paperclip className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--glass-text-muted)]" />
                </div>
                <p className="font-medium text-[var(--glass-text)]">No sources in this notebook</p>
                <p className="text-xs mt-2">Upload files or add links to begin your research.</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {activeSources.map(source => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={source.id} 
                    className="group relative flex flex-col p-3 sm:p-3 glass-panel rounded-2xl transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    onClick={() => setSelectedSource(source)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                        <div className={cn(
                          "p-2 sm:p-3 rounded-xl shrink-0 transition-colors",
                          source.status === 'error' ? "glass-panel-heavy text-red-400" : "glass-panel-heavy text-[var(--glass-accent)]"
                        )}>
                          {getFileIcon(source.type)}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm font-semibold truncate text-[var(--glass-text)]" title={source.name}>
                            {source.name}
                          </span>
                          <span className="text-[10px] font-bold text-[var(--glass-text-muted)] flex items-center gap-2 uppercase tracking-wider">
                            {source.type === 'url' ? 'URL' : formatSize(source.size || 0)}
                            {source.status === 'error' && (
                              <span className="text-red-400 truncate max-w-[100px]">{source.errorText}</span>
                            )}
                            {source.status === 'uploading' && (
                              <span className="text-[var(--glass-accent)]">{source.progress}%</span>
                            )}
                            {source.isSummarizing && (
                              <span className="text-[var(--glass-accent)] flex items-center gap-1">
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                Summarizing
                              </span>
                            )}
                            {source.summary && !source.isSummarizing && (
                              <span className="text-emerald-500 flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5" />
                                Ready
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSource(source.id);
                          }}
                          className="w-8 h-8 glass-icon-btn text-[var(--glass-text-muted)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setSources(prev => prev.map(s => s.id === source.id ? { ...s, isActive: s.isActive === false ? true : false } : s));
                          }}
                          className={cn(
                            "w-10 h-5 rounded-full transition-all relative cursor-pointer shrink-0",
                            source.isActive !== false ? "glass-panel-heavy shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]" : "glass-panel"
                          )}
                          title={source.isActive !== false ? "Included in AI context" : "Excluded from AI context"}
                        >
                          <div className={cn(
                            "absolute top-[2px] left-[2px] w-4 h-4 rounded-full transition-all",
                            source.isActive !== false ? "translate-x-5 bg-[var(--glass-accent)] shadow-[0_0_8px_var(--glass-accent)]" : "translate-x-0 bg-[var(--glass-text-muted)]"
                          )} />
                        </div>
                      </div>
                    </div>
                    {source.status === 'uploading' && (
                      <div className="h-1.5 w-full glass-panel-heavy rounded-full overflow-hidden mt-4">
                        <div 
                          className="h-full bg-[var(--glass-accent)] transition-all duration-300 ease-out shadow-[0_0_8px_var(--glass-accent)]" 
                          style={{ width: `${source.progress}%` }} 
                        />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
        
      <div className="p-6 text-[10px] font-bold text-[var(--glass-text-muted)] text-center uppercase tracking-[0.2em]">
          Neural Engine Active
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent">
        {/* Header */}
        <header className="h-14 sm:h-16 flex items-center px-4 sm:px-6 lg:px-8 py-2 sm:py-3 shrink-0 sticky top-0 z-10 glass-panel shadow-none rounded-b-2xl sm:rounded-b-3xl mb-2">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden w-10 h-10 glass-icon-btn text-[var(--glass-text-muted)] hover:text-[var(--glass-text)] mr-3 sm:mr-4 shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center justify-between w-full min-w-0">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 glass-panel-heavy rounded-xl flex items-center justify-center shrink-0">
                <Book className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--glass-accent)]" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-[var(--glass-text)] text-base sm:text-lg tracking-tight truncate">{activeNotebook.name}</h2>
                <p className="text-[9px] sm:text-[10px] font-bold text-[var(--glass-text-muted)] uppercase tracking-widest truncate">Research Workspace</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 shrink-0 ml-2">
              {micPermission !== 'granted' && (
                <button
                  onClick={requestMicPermission}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                    micPermission === 'denied' ? "bg-red-500/20 text-red-400 border border-red-500/30" : "glass-panel text-[var(--glass-accent)] hover:bg-[var(--glass-accent)]/10"
                  )}
                >
                  <Mic className="w-3 h-3" />
                  {micPermission === 'denied' ? "Mic Blocked" : "Enable Mic"}
                </button>
              )}
              {activeSources.filter(s => s.status === 'ready' && s.isActive !== false).length > 0 && (
                <div className="hidden sm:flex items-center gap-2 glass-panel-heavy px-4 py-2 rounded-2xl shrink-0">
                  <div className="w-2 h-2 bg-[var(--glass-accent)] rounded-full shadow-[0_0_8px_var(--glass-accent)] animate-pulse" />
                  <span className="text-xs font-bold text-[var(--glass-accent)] uppercase tracking-wider">
                    {activeSources.filter(s => s.status === 'ready' && s.isActive !== false).length} Active Contexts
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 sm:space-y-10 scroll-smooth">
          {activeMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-6 sm:space-y-8 px-4">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-16 h-16 sm:w-24 sm:h-24 glass-panel rounded-3xl sm:rounded-[2.5rem] flex items-center justify-center"
              >
                <Book className="w-8 h-8 sm:w-12 sm:h-12 text-[var(--glass-accent)]" />
              </motion.div>
              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--glass-text)]">{activeNotebook.name}</h2>
                <p className="text-[var(--glass-text-muted)] text-sm sm:text-lg leading-relaxed">
                  Synthesize insights from your documents and the web. Upload sources to this notebook to begin an advanced analytical session.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full pt-4">
                <div className="p-3 sm:p-6 glass-panel-heavy rounded-2xl sm:rounded-3xl text-left space-y-2 sm:space-y-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 glass-panel rounded-xl flex items-center justify-center">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--glass-accent)]" />
                  </div>
                  <p className="text-[10px] sm:text-xs font-bold text-[var(--glass-text)] uppercase">Document Analysis</p>
                  <p className="text-[10px] sm:text-[11px] text-[var(--glass-text-muted)] leading-relaxed">Deep synthesis of PDFs, text files, and reports.</p>
                </div>
                <div className="p-3 sm:p-6 glass-panel-heavy rounded-2xl sm:rounded-3xl text-left space-y-2 sm:space-y-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 glass-panel rounded-xl flex items-center justify-center">
                    <LinkIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--glass-accent)]" />
                  </div>
                  <p className="text-[10px] sm:text-xs font-bold text-[var(--glass-text)] uppercase">Web Context</p>
                  <p className="text-[10px] sm:text-[11px] text-[var(--glass-text-muted)] leading-relaxed">Real-time analysis of live website content.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6 sm:space-y-12 pb-6 sm:pb-12">
              {activeMessages.map((msg) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id} 
                  className={cn(
                    "flex gap-3 sm:gap-6",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all",
                    msg.role === 'user' 
                      ? "glass-panel-heavy text-[var(--glass-text-muted)]" 
                      : "glass-panel text-[var(--glass-accent)]"
                  )}>
                    {msg.role === 'user' ? <User className="w-4 h-4 sm:w-5 sm:h-5" /> : <Bot className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </div>
                  <div className={cn(
                    "flex flex-col max-w-[90%] sm:max-w-[85%] space-y-2 group/msg",
                    msg.role === 'user' ? "items-end" : "items-start"
                  )}>
                    <div className={cn(
                      "relative px-3 py-2 sm:px-6 sm:py-5 rounded-2xl sm:rounded-3xl text-sm sm:text-[16px] leading-relaxed",
                      msg.role === 'user' 
                        ? "glass-panel text-[var(--glass-text)] rounded-tr-md" 
                        : "glass-panel-heavy text-[var(--glass-text)] prose prose-invert prose-p:leading-relaxed prose-pre:bg-transparent prose-pre:shadow-none prose-pre:border prose-pre:border-[var(--glass-border)] prose-a:text-[var(--glass-accent)] prose-a:no-underline hover:prose-a:underline prose-headings:text-[var(--glass-text)] prose-headings:font-bold prose-strong:text-[var(--glass-accent)] w-full max-w-none"
                    )}>
                      {msg.isVoiceSummary ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-[var(--glass-accent)] mb-2">
                            <Mic className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-widest">Voice Session Summary</span>
                          </div>
                          <div className="markdown-body">
                            <Markdown remarkPlugins={[remarkGfm]}>{msg.text}</Markdown>
                          </div>
                          {msg.voiceTranscript && msg.voiceTranscript.length > 0 && (
                            <details className="mt-4 group/transcript">
                              <summary className="text-[10px] font-bold uppercase tracking-widest text-[var(--glass-text-muted)] cursor-pointer hover:text-[var(--glass-accent)] transition-colors list-none flex items-center gap-2">
                                <span className="group-open/transcript:rotate-90 transition-transform">▶</span>
                                View Full Transcript ({msg.voiceTranscript.length} turns)
                              </summary>
                              <div className="mt-4 space-y-4 pl-4 border-l-2 border-[var(--glass-border)] max-h-96 overflow-y-auto custom-scrollbar">
                                {msg.voiceTranscript.map((line, i) => {
                                  const isUser = line.startsWith('User:');
                                  const content = line.replace(/^(User|AI):\s*/, '');
                                  return (
                                    <div key={i} className="space-y-1">
                                      <span className={cn(
                                        "text-[10px] font-bold uppercase tracking-widest",
                                        isUser ? "text-[var(--glass-accent)]" : "text-[var(--glass-text-muted)]"
                                      )}>
                                        {isUser ? 'You' : 'AI'}
                                      </span>
                                      <p className="text-sm leading-relaxed text-[var(--glass-text)] opacity-90">
                                        {content}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            </details>
                          )}
                        </div>
                      ) : msg.role === 'user' ? (
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                      ) : (
                        <div className="markdown-body">
                          {isLoading && msg.id === activeMessages[activeMessages.length - 1].id && !msg.text ? (
                            <AdvancedLoadingState />
                          ) : (
                            <Markdown remarkPlugins={[remarkGfm]}>
                              {msg.text}
                            </Markdown>
                          )}
                          {msg.role === 'model' && msg.text && (
                            <div className="absolute top-2 right-2 sm:top-4 sm:right-4 flex items-center gap-2 opacity-0 group-hover/msg:opacity-100 transition-all">
                              <button 
                                onClick={() => handleVoiceFollowUp(msg)}
                                className="flex items-center gap-2 px-3 py-1.5 glass-panel-heavy rounded-xl text-[10px] font-bold uppercase tracking-widest text-[var(--glass-accent)] hover:scale-105 transition-all"
                                title="Talk about this live"
                              >
                                <Mic className="w-3 h-3" />
                                Talk Live
                              </button>
                              <button 
                                onClick={() => navigator.clipboard.writeText(msg.text)}
                                className="w-8 h-8 glass-icon-btn text-[var(--glass-text-muted)] hover:text-[var(--glass-text)]"
                                title="Copy response"
                              >
                                <Paperclip className="w-4 h-4 rotate-45" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-[var(--glass-text-muted)] uppercase tracking-widest px-2">
                      {msg.role === 'user' ? 'Analytical Query' : 'Intelligence Response'}
                    </span>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3 sm:p-6 lg:p-10 pb-3 sm:pb-6 bg-transparent">
          <div className="max-w-4xl mx-auto relative">
            <form 
              onSubmit={handleSubmit}
              className="relative flex items-end gap-2 sm:gap-3 glass-panel-heavy rounded-[2rem] sm:rounded-[2.5rem] p-2 sm:p-3 transition-all"
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 sm:w-14 sm:h-14 glass-icon-btn text-[var(--glass-text-muted)] hover:text-[var(--glass-accent)] shrink-0"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4 sm:w-6 sm:h-6" />
              </button>
              
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder={activeSources.length > 0 ? "Ask a question..." : "Add sources to begin..."}
                className="w-full max-h-40 sm:max-h-60 min-h-[40px] sm:min-h-[56px] bg-transparent border-none focus:ring-0 focus:outline-none resize-none py-2.5 sm:py-4 px-3 sm:px-4 text-sm sm:text-[16px] text-[var(--glass-text)] placeholder:text-[var(--glass-text-muted)]"
                rows={1}
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${Math.min(target.scrollHeight, 240)}px`;
                }}
              />
              
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={cn(
                  "w-10 h-10 sm:w-14 sm:h-14 glass-icon-btn shrink-0 disabled:opacity-50 disabled:cursor-not-allowed",
                  isLoading 
                    ? "text-[var(--glass-text-muted)]" 
                    : "text-[var(--glass-accent)]"
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 sm:w-6 sm:h-6 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 sm:w-6 sm:h-6 ml-0.5 sm:ml-1" />
                )}
              </button>
            </form>
            <div className="flex justify-between items-center mt-2 sm:mt-4 px-3 sm:px-4">
              <div className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-bold text-[var(--glass-text-muted)] uppercase tracking-widest">
                <Sparkles className="w-3 h-3 text-[var(--glass-accent)]" />
                Synthesis Active
              </div>
              <div className="text-[9px] sm:text-[10px] font-bold text-[var(--glass-text-muted)] uppercase tracking-widest">
                Gemini 3.1 Pro
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
