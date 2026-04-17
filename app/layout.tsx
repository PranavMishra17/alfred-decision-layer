import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "alfred_ Decision Layer",
  description:
    "Explore alfred_'s execution decision engine. Watch how an AI assistant decides whether to act silently, notify, confirm, clarify, or refuse — in real time.",
  keywords: ["AI assistant", "decision layer", "execution policy", "alfred", "LLM pipeline"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body>{children}</body>
    </html>
  );
}
