import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Loader2, Database, BrainCircuit, Sparkles, CheckCircle2 } from 'lucide-react';

const BOOT_STEPS = [
  { icon: Database, text: "Accessing Knowledge Base..." },
  { icon: BrainCircuit, text: "Initializing Neural Pathways..." },
  { icon: Sparkles, text: "Synthesizing Insights..." },
  { icon: CheckCircle2, text: "Formatting Output..." }
];

export const AdvancedLoadingState: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(prev => Math.min(prev + 1, BOOT_STEPS.length - 1));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-4 py-4 px-2">
      <div className="flex items-center gap-3 text-[var(--glass-accent)]">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-xs font-bold uppercase tracking-widest">Processing Query</span>
      </div>
      
      <div className="space-y-3 pl-2">
        {BOOT_STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isPast = index < currentStep;
          
          return (
            <motion.div 
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ 
                opacity: isPast || isActive ? 1 : 0.3,
                x: 0,
                scale: isActive ? 1.02 : 1
              }}
              className={`flex items-center gap-3 text-xs ${isActive ? 'text-[var(--glass-text)] font-bold' : isPast ? 'text-[var(--glass-text-muted)]' : 'text-[var(--glass-text-muted)] opacity-50'}`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isActive ? 'bg-[var(--glass-accent)]/20 text-[var(--glass-accent)]' : isPast ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[var(--glass-border)] text-[var(--glass-text-muted)]'}`}>
                {isPast ? <CheckCircle2 className="w-3 h-3" /> : <Icon className={`w-3 h-3 ${isActive ? 'animate-pulse' : ''}`} />}
              </div>
              <span className="tracking-wide">{step.text}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
