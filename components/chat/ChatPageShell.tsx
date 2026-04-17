"use client";

import Link from "next/link";
import { AlfredAvatar } from "@/components/shared/AlfredAvatar";
import { ChatPanel }    from "@/components/chat/ChatPanel";
import { MindPanel }    from "@/components/mind/MindPanel";

/**
 * Full-viewport chat layout.
 * Left 60 % — Chat Panel
 * Right 40 % — Agent Mind Panel
 * Source: UI-UX-DESIGN.md §3.2
 */
import { useStore }                from "@/state/store";

export function ChatPageShell() {
  const clearAllState = useStore((s) => s.clearAllState);

  const handleNewConversation = () => {
    clearAllState();
    window.dispatchEvent(new CustomEvent("alfred:clear-runs"));
  };

  return (
    <div
      className="flex flex-col h-dvh overflow-hidden"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* ----------------------------------------------------------------
          Top bar
      ----------------------------------------------------------------- */}
      <header
        className="flex items-center justify-between px-4 h-12 shrink-0 border-b"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor:     "var(--border-subtle)",
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          id="topbar-home-link"
          className="flex items-center gap-2 transition-opacity hover:opacity-80 w-1/3"
          aria-label="alfred_ home"
        >
          <AlfredAvatar state="idle" size={24} />
          <span
            className="font-mono text-sm font-bold tracking-wide"
            style={{ color: "var(--accent-copper)" }}
          >
            alfred_
          </span>
        </Link>

        {/* Center */}
        <div className="flex items-center justify-center w-1/3">
          <span
            className="font-mono text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            Decision Layer
          </span>
        </div>

        {/* Right actions */}
        <div className="flex items-center justify-end gap-2 w-1/3">
          <button
            onClick={handleNewConversation}
            className="font-mono text-xs px-3 py-1.5 rounded border transition-colors duration-150"
            style={{
              color:           "var(--text-secondary)",
              borderColor:     "var(--border-subtle)",
              backgroundColor: "transparent",
            }}
            aria-label="New conversation"
          >
            New Conversation
          </button>
          <button
            id="topbar-settings-btn"
            className="font-mono text-xs px-3 py-1.5 rounded border transition-colors duration-150"
            style={{
              color:           "var(--text-secondary)",
              borderColor:     "var(--border-subtle)",
              backgroundColor: "transparent",
            }}
            aria-label="Open settings"
          >
            Settings
          </button>
        </div>
      </header>

      {/* ----------------------------------------------------------------
          Two-panel body
      ----------------------------------------------------------------- */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat panel — 60 % */}
        <div
          className="flex flex-col border-r"
          style={{
            width:       "60%",
            borderColor: "var(--border-subtle)",
          }}
        >
          <ChatPanel />
        </div>

        {/* Mind panel — 40 % */}
        <div
          className="flex flex-col"
          style={{ width: "40%" }}
        >
          <MindPanel />
        </div>
      </div>
    </div>
  );
}
