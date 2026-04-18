"use client";

import { useState } from "react";
import { AlfredAvatar } from "./AlfredAvatar";

export function EasterEggAvatar() {
  const [popped, setPopped] = useState(false);

  if (popped) return null;

  return (
    <div 
      className="absolute top-1/4 left-1/4 z-0 cursor-pointer animate-float-roam opacity-20 hover:opacity-100 transition-opacity duration-300"
      onClick={(e) => {
        e.currentTarget.classList.remove("animate-float-roam");
        e.currentTarget.classList.add("animate-balloon-pop");
        setTimeout(() => setPopped(true), 300);
      }}
      aria-hidden="true"
    >
      <AlfredAvatar state="idle" size={64} />
      <span className="sr-only">Pop the alfred_ balloon</span>
    </div>
  );
}
