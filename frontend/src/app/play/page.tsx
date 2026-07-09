"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Play() {
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const router = useRouter();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin && name) {
      // Store name in sessionStorage to retrieve in the game room
      sessionStorage.setItem("playerName", name);
      router.push(`/game/${pin}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="glass-panel p-12 max-w-md w-full flex flex-col items-center gap-6 animate-fade-in text-center">
        <h1 className="logo-text">TurboHoot</h1>
        
        <form onSubmit={handleJoin} className="w-full flex flex-col gap-4 mt-4">
          <input
            type="text"
            placeholder="Game PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="input-field text-center font-bold text-2xl tracking-widest uppercase"
            maxLength={6}
            required
          />
          <input
            type="text"
            placeholder="Nickname"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field text-center font-bold text-xl"
            maxLength={15}
            required
          />
          <button type="submit" className="btn-primary w-full mt-4 py-4 text-xl">
            Enter
          </button>
        </form>

        <Link href="/" className="text-gray-400 hover:text-white mt-4 text-sm transition-colors">
          Back to Home
        </Link>
      </div>
    </main>
  );
}
