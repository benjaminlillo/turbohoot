"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSocket } from "@/components/SocketProvider";

export default function Admin() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();
  const { socket, isConnected } = useSocket();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    if (!isConnected || !socket) {
      setError("Not connected to server. Please wait or refresh.");
      return;
    }

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      
      // Basic validation
      if (!Array.isArray(json)) {
        throw new Error("JSON must be an array of questions.");
      }

      // Send to server
      socket.emit("create_session", { questions: json }, (response: any) => {
        if (response.status === "success") {
          router.push(`/host/${response.pin}`);
        } else {
          setError(response.message || "Failed to create session");
        }
      });
    } catch (err: any) {
      setError("Invalid JSON file: " + err.message);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="glass-panel p-12 max-w-lg w-full flex flex-col items-center gap-6 animate-fade-in text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-gray-300 text-sm">Upload a JSON file containing the questions.</p>
        </div>
        
        <div className="w-full bg-[rgba(0,0,0,0.3)] rounded-xl p-4 border border-white/10 text-left mb-2 text-sm">
          <p className="text-gray-300 font-semibold mb-2">Expected JSON Format:</p>
          <pre className="text-[var(--secondary-light)] overflow-x-auto">
{`[
  {
    "id": "q1",
    "text": "Question text here?",
    "options": [
      { "id": "o1", "text": "Option 1" },
      { "id": "o2", "text": "Option 2" }
    ],
    "correctOptionId": "o1"
  }
]`}
          </pre>
        </div>
        
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
          <div className="relative group border-2 border-dashed border-[var(--panel-border)] rounded-2xl p-10 hover:border-[var(--primary-light)] hover:bg-[rgba(255,255,255,0.05)] transition-all duration-300 cursor-pointer overflow-hidden">
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className={`flex flex-col items-center justify-center gap-4 transition-transform duration-300 group-hover:scale-105 ${file ? 'text-[var(--secondary-light)]' : 'text-white'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`drop-shadow-lg ${file ? 'animate-bounce' : ''}`}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              <span className="font-bold text-xl drop-shadow-sm">{file ? file.name : "Drag & Drop JSON File"}</span>
              {!file && <span className="text-sm text-gray-400">or click to browse</span>}
            </div>
            {/* Subtle glow effect behind */}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--primary)] to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={!file || !isConnected} className="btn-secondary w-full py-4 text-xl disabled:opacity-50 disabled:cursor-not-allowed">
            Generate Session
          </button>
        </form>

        <Link href="/" className="text-gray-400 hover:text-white mt-4 text-sm transition-colors">
          Back to Home
        </Link>
      </div>
    </main>
  );
}
