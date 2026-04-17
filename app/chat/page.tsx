import type { Metadata } from "next";
import { ChatPageShell } from "@/components/chat/ChatPageShell";

export const metadata: Metadata = {
  title: "Chat — alfred_ Decision Layer",
  description:
    "Submit action scenarios and watch alfred_'s decision pipeline classify each action in real time.",
};

export default function ChatPage() {
  return <ChatPageShell />;
}
