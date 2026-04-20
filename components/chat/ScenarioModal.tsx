"use client";

import { useState } from "react";
import { ScenarioSlate } from "./ScenarioSlate";

export interface Scenario {
  id: string;
  title: string;
  category: string;
  description: string;
  context_type: string;
  predefined_instruction: string;
  user_message: string;
  mock_context: Record<string, unknown>;
  conversation_history?: { role: string; content: string; timestamp?: string }[];
  pre_seeded_obligations?: Record<string, unknown>[];
}

interface ScenarioModalProps {
  scenario: Scenario;
  onClose: () => void;
  onSend: (instruction: string) => void;
}

export function ScenarioModal({ scenario, onClose, onSend }: ScenarioModalProps) {
  const [instruction, setInstruction] = useState(scenario.user_message);
  const [showModify, setShowModify] = useState(false);

  const getBorderColor = () => {
    switch (scenario.category) {
      case "easy": return "border-[#8ABFA7]"; // sage equivalent
      case "ambiguous": return "border-[#C8B07A]"; // confirm equivalent
      case "adversarial": return "border-[#C28A8A]"; // refuse equivalent
      case "failure": return "border-[var(--text-muted)]";
      default: return "border-[var(--border-subtle)]";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className={`relative bg-[var(--bg-secondary)] border-2 ${getBorderColor()} rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] animate-scale-in`}>
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)] rounded-t-xl">
          <div className="flex items-center gap-3">
            <h2 className="font-mono text-base font-bold text-white">{scenario.title}</h2>
            <span className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded border ${getBorderColor()}`}>
              {scenario.category}
            </span>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white font-mono text-xl">
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col overflow-y-auto p-5 gap-6">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs text-[var(--accent-copper)]">CONTEXT TYPE</span>
            <span className="font-sans text-sm text-[var(--text-secondary)] capitalize">
              {scenario.context_type.replace(/_/g, " ")}
            </span>
            <p className="font-sans text-sm italic text-[var(--text-muted)]">{scenario.description}</p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs text-[var(--accent-copper)]">MOCK CONTEXT PROVIDED</span>
            {/* Use the shared ScenarioSlate */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <ScenarioSlate scenario={scenario} />
            </div>
          </div>

          <div className="flex flex-col gap-3 p-4 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg">
            <span className="font-mono text-xs text-[var(--text-primary)]">PREDEFINED INSTRUCTION</span>
            {showModify ? (
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-[var(--accent-copper)] rounded p-2 text-sm text-white font-sans focus:outline-none"
                rows={3}
              />
            ) : (
              <p className="font-sans text-sm text-white">{instruction}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] rounded-b-xl shrink-0">
          <button
            onClick={() => setShowModify(!showModify)}
            className="font-mono text-xs px-3 py-1.5 rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-input)]"
          >
            {showModify ? "Lock Instruction" : "+ Modify Instruction"}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="font-mono text-xs text-[var(--text-muted)] hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onSend(instruction);
                onClose();
              }}
              className="font-mono text-xs px-4 py-2 rounded bg-[var(--accent-copper)] text-[var(--bg-primary)] font-bold hover:bg-[#D49E72] transition-colors"
            >
              Send to alfred_
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
