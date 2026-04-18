"use client";

import { useState } from "react";
import PRELOADED_SCENARIOS from "@/scenarios/preloaded.json";
import { useStore } from "@/state/store";
import { ScenarioModal } from "./ScenarioModal";

export function ScenarioTabs() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const clearAllState = useStore((s) => s.clearAllState);
  const addObligations = useStore((s) => s.addObligations);

  const [modalScenario, setModalScenario] = useState<typeof PRELOADED_SCENARIOS[0] | null>(null);

  const handleSelect = (scenario: typeof PRELOADED_SCENARIOS[0]) => {
    setActiveId(scenario.id);
    setModalScenario(scenario);
  };

  const handleSendScenario = (instruction: string) => {
    if (!modalScenario) return;
    clearAllState();
    if (modalScenario.pre_seeded_obligations?.length > 0) {
      addObligations(modalScenario.pre_seeded_obligations, "startup");
    }
    window.dispatchEvent(
      new CustomEvent("alfred:submit-scenario", { detail: { 
        instruction, 
        scenario: modalScenario 
      }})
    );
    window.dispatchEvent(new CustomEvent("alfred:clear-runs"));
    setModalScenario(null);
  };

  return (
    <>
    <div className="flex gap-2 overflow-x-auto px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] hide-scrollbar">
      {PRELOADED_SCENARIOS.map((s) => (
        <button
          key={s.id}
          onClick={() => handleSelect(s)}
          className={`shrink-0 font-mono text-[10px] uppercase px-3 py-1.5 rounded border transition-colors ${
            activeId === s.id
              ? "text-[var(--bg-primary)] bg-[var(--accent-copper)] border-[var(--accent-copper)]"
              : "text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]"
          }`}
          title={s.description}
        >
          {s.title}
        </button>
      ))}
    </div>
      {modalScenario && (
        <ScenarioModal 
          scenario={modalScenario as any} 
          onClose={() => setModalScenario(null)} 
          onSend={handleSendScenario} 
        />
      )}
    </>
  );
}
