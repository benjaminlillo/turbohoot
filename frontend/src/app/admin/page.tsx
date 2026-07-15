"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSocket } from "@/components/SocketProvider";

export default function Admin() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const router = useRouter();
  const { socket, isConnected } = useSocket();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError("");
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    if (!isConnected || !socket) {
      setError("Not connected to server. Please ensure NEXT_PUBLIC_BACKEND_URL is set in your environment.");
      return;
    }

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      
      // Basic validation
      if (!Array.isArray(json)) {
        throw new Error("JSON must be an array of questions.");
      }

      // Transform JSON to backend format
      const questions = json.map((q: any) => {
        if (!q.id || !q.text || !Array.isArray(q.options)) {
          throw new Error("Invalid question format");
        }
        return {
          ...q,
          options: q.options.map((opt: any) => ({
            ...opt,
            isCorrect: q.correctOptionId ? opt.id === q.correctOptionId : opt.isCorrect === true
          }))
        };
      });

      // Send to server
      socket.emit("create_session", { questions }, (response: any) => {
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
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
      <div className="glass-panel p-6 md:p-12 max-w-lg w-full flex flex-col items-center gap-6 animate-fade-in text-center shadow-xl">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-gray-300 text-sm">Upload a JSON file containing the questions.</p>
          {!isConnected && (
            <div className="mt-2 text-xs font-bold bg-red-500/20 text-red-300 px-3 py-2 rounded-lg border border-red-500/50">
              Disconnected from server. Button is disabled.
            </div>
          )}
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
          <div 
            className={`relative group border-2 border-dashed rounded-2xl p-10 transition-all duration-300 overflow-hidden 
              ${isDragging ? 'border-[var(--secondary-light)] bg-[rgba(103,199,114,0.1)]' : 'border-[var(--panel-border)] hover:border-[var(--primary-light)] hover:bg-[rgba(255,255,255,0.05)]'}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              title="Drag and drop or click to upload"
            />
            <div className={`flex flex-col items-center justify-center gap-4 transition-transform duration-300 pointer-events-none ${isDragging ? 'scale-105 text-[var(--secondary-light)]' : file ? 'text-[var(--secondary-light)] group-hover:scale-105' : 'text-white'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`drop-shadow-lg transition-transform duration-500 ease-out ${isDragging || file ? 'scale-110 text-[var(--secondary-light)]' : ''}`}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              <span className="font-bold text-xl drop-shadow-sm">{file ? file.name : "Drag & Drop JSON File"}</span>
              {!file && <span className="text-sm text-gray-400">or click to browse</span>}
            </div>
            {/* Subtle glow effect behind */}
            <div className={`absolute inset-0 bg-gradient-to-t from-[var(--primary)] to-transparent transition-opacity duration-300 ${isDragging ? 'opacity-30' : 'opacity-0 group-hover:opacity-20'}`}></div>
          </div>

          {error && <p className="text-red-400 text-sm font-semibold">{error}</p>}

          <button 
            type="submit" 
            disabled={!file || !isConnected} 
            className={`btn-secondary w-full py-4 text-xl font-bold ${(!file || !isConnected) ? 'opacity-50 cursor-not-allowed grayscale-[50%]' : ''}`}
          >
            Generate Session
          </button>
        </form>

        <Link href="/" className="text-gray-400 hover:text-white mt-4 text-sm transition-colors font-semibold">
          Back to Home
        </Link>
      </div>
    </main>
  );
}
