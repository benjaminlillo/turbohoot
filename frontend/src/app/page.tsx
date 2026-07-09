"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="glass-panel p-12 max-w-md w-full flex flex-col items-center gap-8 animate-fade-in text-center">
        <div>
          <h1 className="logo-text">TurboHoot</h1>
          <p className="text-gray-300 mt-2">The ultimate real-time trivia experience</p>
        </div>
        
        <div className="w-full flex flex-col gap-4">
          <Link href="/play" className="btn-primary w-full text-center block text-lg py-4">
            Join a Game
          </Link>
          <Link href="/admin" className="btn-secondary w-full text-center block text-lg py-4">
            Host a Game
          </Link>
        </div>
      </div>
    </main>
  );
}
