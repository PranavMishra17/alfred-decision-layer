"use client";

import { useStore } from "@/state/store";

interface SettingsSheetProps {
  onClose: () => void;
}

export function SettingsSheet({ onClose }: SettingsSheetProps) {
  const {
    anthropicApiKey,
    setAnthropicApiKey,
    cartesiaApiKey,
    setCartesiaApiKey,
    threshold,
    setThreshold,
    injectTimeout,
    setInjectTimeout,
    injectMalformedOutput,
    setInjectMalformedOutput,
    injectMissingContext,
    setInjectMissingContext,
  } = useStore();

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-40 transition-opacity" 
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div className="fixed top-0 right-0 h-full w-[400px] border-l border-[var(--border-subtle)] bg-[var(--bg-secondary)] shadow-2xl z-50 flex flex-col overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]">
          <h2 className="font-mono text-sm font-bold tracking-wide text-white">Settings</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white font-mono text-xl">
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col p-6 gap-8">
          
          {/* API Keys */}
          <section className="flex flex-col gap-4">
            <h3 className="font-mono text-xs uppercase tracking-wider text-[var(--accent-copper)]">API Capabilities</h3>
            <div className="flex flex-col gap-2">
              <label className="font-sans text-sm text-[var(--text-secondary)]">Anthropic API Key</label>
              <input 
                type="password"
                placeholder="sk-ant-..."
                className="bg-black/20 border border-[var(--border-subtle)] rounded p-2 text-sm font-mono text-white focus:border-[var(--accent-copper)] outline-none"
                value={anthropicApiKey}
                onChange={(e) => setAnthropicApiKey(e.target.value)}
              />
              <span className="font-mono text-[10px] text-[var(--text-muted)]">Required for P2 reasoning. Keys are stored only in localStorage.</span>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="font-sans text-sm text-[var(--text-secondary)]">Cartesia API Key</label>
              <input 
                type="password"
                placeholder="sk-cartesia-..."
                className="bg-black/20 border border-[var(--border-subtle)] rounded p-2 text-sm font-mono text-white focus:border-[var(--accent-copper)] outline-none"
                value={cartesiaApiKey}
                onChange={(e) => setCartesiaApiKey(e.target.value)}
              />
              <span className="font-mono text-[10px] text-[var(--text-muted)]">Required for P5 TTS streaming (M9).</span>
            </div>
          </section>

          <hr className="border-[var(--border-subtle)]" />

          {/* Engine Parameters */}
          <section className="flex flex-col gap-4">
            <h3 className="font-mono text-xs uppercase tracking-wider text-[var(--accent-copper)]">Engine Parameters</h3>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="font-sans text-sm text-[var(--text-secondary)]">Risk Threshold</label>
                <span className="font-mono text-xs text-[var(--text-primary)]">{threshold.toFixed(2)}</span>
              </div>
              <input 
                type="range"
                min="0.1" max="0.9" step="0.05"
                className="accent-[var(--accent-copper)] cursor-ew-resize"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
              />
              <span className="font-mono text-[10px] text-[var(--text-muted)] mt-1">
                Controls P3 deterministic gating. Risk &lt; threshold ? NOTIFY : CONFIRM.
              </span>
            </div>
          </section>

          <hr className="border-[var(--border-subtle)]" />

          {/* Failure Injection */}
          <section className="flex flex-col gap-4">
            <h3 className="font-mono text-xs uppercase tracking-wider text-[var(--decision-refuse)]">Failure Injection</h3>
            <p className="font-sans text-xs text-[var(--text-muted)]">
              These act as one-shot triggers. Activating one forces the specified failure on the VERY NEXT pipeline run.
            </p>
            
            <button 
              onClick={() => setInjectTimeout(!injectTimeout)}
              className={`flex justify-between items-center px-4 py-3 rounded border font-mono text-xs transition-colors ${
                injectTimeout 
                ? "bg-[var(--decision-refuse)]/20 border-[var(--decision-refuse)] text-[var(--decision-refuse)]" 
                : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-white/5"
              }`}
            >
              Force LLM Timeout
              {injectTimeout && <span className="w-2 h-2 rounded-full bg-[var(--decision-refuse)] animate-pulse" />}
            </button>
            
            <button 
              onClick={() => setInjectMalformedOutput(!injectMalformedOutput)}
              className={`flex justify-between items-center px-4 py-3 rounded border font-mono text-xs transition-colors ${
                injectMalformedOutput 
                ? "bg-[var(--decision-refuse)]/20 border-[var(--decision-refuse)] text-[var(--decision-refuse)]" 
                : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-white/5"
              }`}
            >
              Force Malformed JSON
              {injectMalformedOutput && <span className="w-2 h-2 rounded-full bg-[var(--decision-refuse)] animate-pulse" />}
            </button>

            <button 
              onClick={() => setInjectMissingContext(!injectMissingContext)}
              className={`flex justify-between items-center px-4 py-3 rounded border font-mono text-xs transition-colors ${
                injectMissingContext 
                ? "bg-[var(--decision-refuse)]/20 border-[var(--decision-refuse)] text-[var(--decision-refuse)]" 
                : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-white/5"
              }`}
            >
              Force Missing Context Error
              {injectMissingContext && <span className="w-2 h-2 rounded-full bg-[var(--decision-refuse)] animate-pulse" />}
            </button>

          </section>

        </div>
      </div>
    </>
  );
}
