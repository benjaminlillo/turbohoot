"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/components/SocketProvider";

type GameState = 'LOBBY' | 'QUESTION' | 'RESULT' | 'LEADERBOARD';

export default function PlayerGame({ params }: { params: Promise<{ pin: string }> }) {
  const resolvedParams = use(params);
  const pin = resolvedParams.pin;
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const [name, setName] = useState("");
  const [gameState, setGameState] = useState<GameState>('LOBBY');
  
  const [question, setQuestion] = useState<any>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [score, setScore] = useState(0); // Optional: keep track of own score
  const [timeLeft, setTimeLeft] = useState(25);

  useEffect(() => {
    const storedName = sessionStorage.getItem("playerName");
    if (!storedName) {
      router.push("/play");
      return;
    }
    setName(storedName);

    if (isConnected && socket) {
      socket.emit("join_session", { pin, name: storedName }, (response: any) => {
        if (response.status === "error") {
          alert(response.message);
          router.push("/play");
        }
      });
    }
  }, [isConnected, socket, pin, router]);

  useEffect(() => {
    if (!socket) return;

    socket.on('new_question', (data) => {
      setGameState('QUESTION');
      setQuestion(data.question);
      setHasAnswered(false);
      setResult(null);
      setTimeLeft(25);
      
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // We'll attach the interval ID to the window so we can clear it if needed
      (window as any).questionInterval = interval;
    });

    socket.on('show_results', (data) => {
      if ((window as any).questionInterval) {
        clearInterval((window as any).questionInterval);
      }
      setGameState('RESULT');
      setResult(data);
    });

    socket.on('show_leaderboard', (data) => {
      setGameState('LEADERBOARD');
      setLeaderboard(data);
    });

    socket.on('session_closed', () => {
      alert("Game ended by host.");
      router.push("/");
    });

    return () => {
      socket.off('new_question');
      socket.off('show_results');
      socket.off('show_leaderboard');
      socket.off('session_closed');
      if ((window as any).questionInterval) clearInterval((window as any).questionInterval);
    };
  }, [socket, router]);

  const handleAnswer = (optionId: string) => {
    if (!hasAnswered && socket) {
      socket.emit("submit_answer", { pin, optionId });
      setHasAnswered(true);
    }
  };

  const renderLobby = () => (
    <div className="glass-panel p-6 md:p-12 flex flex-col items-center animate-fade-in text-center mx-4">
      <h2 className="text-2xl md:text-3xl font-bold mb-4">You're in!</h2>
      <p className="text-lg md:text-xl">See your nickname on screen</p>
      <div className="mt-8 text-3xl md:text-4xl font-black text-[var(--primary-light)]">{name}</div>
    </div>
  );

  const renderQuestion = () => {
    if (hasAnswered) {
      return (
        <div className="glass-panel p-6 md:p-12 flex flex-col items-center animate-fade-in text-center mx-4">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Waiting for others...</h2>
          <div className="animate-pulse w-12 h-12 md:w-16 md:h-16 rounded-full bg-[var(--primary)] mt-8"></div>
        </div>
      );
    }

    const colors = ['color-red', 'color-blue', 'color-yellow', 'color-green'];

    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 animate-fade-in relative pt-16">
        <div className="absolute top-4 w-full flex justify-between px-4 md:px-8 items-center">
          <div className="text-xl md:text-2xl font-bold">{timeLeft}</div>
        </div>
        
        <div className="glass-panel p-4 md:p-6 mb-4 md:mb-8 w-full max-w-4xl text-center">
          <h2 className="text-xl md:text-2xl font-bold">{question?.text}</h2>
        </div>

        <div className="answer-grid h-full w-full max-w-4xl flex-1 mt-4">
          {question?.options.map((opt: any, index: number) => {
            const isPressed = hasAnswered; // We'll just disable the visual state globally for now or keep it simple
            
            // Icon shapes matching classic trivia
            const shapes = [
              <svg key="triangle" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L22 20H2L12 2Z"/></svg>,
              <svg key="diamond" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L22 12L12 22L2 12L12 2Z"/></svg>,
              <svg key="circle" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>,
              <svg key="square" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
            ];

            return (
              <button
                key={opt.id}
                onClick={() => handleAnswer(opt.id)}
                disabled={hasAnswered}
                className={`answer-btn ${colors[index % 4]} flex flex-col items-center justify-center gap-2 p-2 ${hasAnswered ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="drop-shadow-md scale-75 md:scale-100">{shapes[index % 4]}</div>
                <span className="font-bold text-center drop-shadow-md text-sm md:text-xl leading-tight line-clamp-3">{opt.text}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderResult = () => {
    // Determine if player got it right locally (complex since we only know correct option ID)
    // Actually, we didn't save what the player answered locally, but we can visually show correct/incorrect if we save the selected option.
    // Let's assume we just wait for next question here or show a generic result message.
    return (
      <div className="glass-panel p-6 md:p-12 flex flex-col items-center animate-fade-in text-center mx-4">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Time's Up!</h2>
        <p className="text-lg md:text-xl text-gray-300 mb-4 md:mb-8">Look at the host screen for results.</p>
      </div>
    );
  };

  const renderLeaderboard = () => {
    const myRank = leaderboard.findIndex(p => p.name === name) + 1;
    const me = leaderboard.find(p => p.name === name);
    return (
      <div className="glass-panel p-6 md:p-12 w-full max-w-lg flex flex-col items-center animate-fade-in mx-4">
        <h2 className="text-3xl md:text-4xl font-bold mb-6 md:mb-8 text-[var(--secondary-light)]">Final Results</h2>
        <div className="text-xl md:text-2xl mb-4">Your Rank: #{myRank > 0 ? myRank : '-'}</div>
        <div className="text-lg md:text-xl text-gray-300">Total Score: {me?.score || 0}</div>
        
        <button onClick={() => router.push("/")} className="btn-primary mt-8 md:mt-12 py-3 px-8 text-lg w-full md:w-auto">
          Back to Home
        </button>
      </div>
    );
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] w-full">
      {gameState === 'LOBBY' && renderLobby()}
      {gameState === 'QUESTION' && renderQuestion()}
      {gameState === 'RESULT' && renderResult()}
      {gameState === 'LEADERBOARD' && renderLeaderboard()}
    </main>
  );
}
