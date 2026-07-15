"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/components/SocketProvider";

type GameState = 'LOBBY' | 'QUESTION' | 'RESULT' | 'LEADERBOARD';

export default function HostGame({ params }: { params: Promise<{ pin: string }> }) {
  const resolvedParams = use(params);
  const pin = resolvedParams.pin;
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const [gameState, setGameState] = useState<GameState>('LOBBY');
  
  const [players, setPlayers] = useState<any[]>([]);
  const [question, setQuestion] = useState<any>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25);
  
  const [results, setResults] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [joinUrl, setJoinUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setJoinUrl(`${window.location.origin}/play?join=${pin}`);
    }
  }, [pin]);

  useEffect(() => {
    if (!socket) return;

    socket.on('update_players', (playerList) => {
      setPlayers(playerList);
    });

    socket.on('game_started', () => {
      setGameState('QUESTION');
    });

    socket.on('new_question', (data) => {
      setGameState('QUESTION');
      setQuestion(data.question);
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
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

      // Clean up interval on unmount or next question
      return () => clearInterval(interval);
    });

    socket.on('show_results', (data) => {
      setGameState('RESULT');
      setResults(data);
    });

    socket.on('show_leaderboard', (data) => {
      setGameState('LEADERBOARD');
      setLeaderboard(data);
    });

    return () => {
      socket.off('update_players');
      socket.off('game_started');
      socket.off('new_question');
      socket.off('show_results');
      socket.off('show_leaderboard');
    };
  }, [socket]);

  const handleStart = () => {
    if (socket) {
      socket.emit("start_game", { pin });
    }
  };

  const handleNext = () => {
    if (socket) {
      socket.emit("next_question", { pin });
    }
  };

  const handleSkipTime = () => {
    if (socket) {
      socket.emit("skip_question_time", { pin });
    }
  };

  const renderLobby = () => (
    <div className="flex flex-col items-center justify-center w-full flex-1 px-8 py-12 md:px-24 md:py-24 min-h-screen">
      <div className="glass-panel flex flex-col items-center w-full max-w-6xl gap-12 shadow-2xl">
        
        <div className="flex flex-col md:flex-row justify-between items-center w-full gap-8 md:gap-0">
          <div className="flex flex-col gap-4 w-full text-center md:text-left items-center md:items-start">
            <div>
              <h2 className="text-lg md:text-xl text-gray-300 uppercase tracking-widest">Join at TurboHoot with PIN:</h2>
              <div className="text-5xl md:text-7xl font-black text-[var(--primary-light)] mt-2 drop-shadow-md">{pin}</div>
            </div>
            {joinUrl && (
              <div className="flex items-center gap-3 md:gap-4 bg-[rgba(0,0,0,0.3)] p-3 md:p-4 rounded-2xl border border-white/10 w-fit mx-auto md:mx-0 mt-4 shadow-inner">
                <span className="text-base md:text-xl text-gray-300 px-2 truncate max-w-[250px] sm:max-w-[400px] md:max-w-[500px] tracking-wide">{joinUrl}</span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(joinUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.2)] px-6 py-3 md:px-8 md:py-4 rounded-xl text-base md:text-lg font-bold transition-all whitespace-nowrap shadow-md active:scale-95"
                >
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            )}
          </div>
          
          <button 
            onClick={handleStart}
            disabled={players.length === 0}
            className="btn-secondary text-2xl md:text-3xl py-4 px-12 md:py-6 md:px-14 disabled:opacity-50 w-full md:w-auto shadow-xl"
          >
            Start
          </button>
        </div>

        <div className="w-full h-px bg-white/10 my-2"></div>

        <div className="w-full min-h-[200px]">
          <h3 className="text-2xl font-bold mb-6 text-center md:text-left">Players ({players.length})</h3>
          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            {players.map((p) => (
              <div key={p.id} className="bg-[rgba(255,255,255,0.1)] border border-white/5 px-6 py-3 rounded-full text-lg md:text-xl font-bold animate-fade-in shadow-md">
                {p.name}
              </div>
            ))}
            {players.length === 0 && (
              <div className="text-gray-400 italic w-full text-center md:text-left text-lg">Waiting for players to join...</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );

  const renderQuestion = () => {
    const colors = ['color-red', 'color-blue', 'color-yellow', 'color-green'];
    
    return (
      <div className="flex flex-col items-center w-full min-h-screen p-4 md:p-8 justify-between">
        <div className="w-full max-w-6xl flex justify-between items-center mb-4">
          <div className="text-lg md:text-xl font-bold">Question {questionIndex + 1} of {totalQuestions}</div>
          <div className="flex items-center gap-4 md:gap-6">
            <div className={`text-4xl md:text-5xl font-black ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
              {timeLeft}
            </div>
            <button onClick={handleSkipTime} className="btn-secondary py-2 px-4 text-sm md:text-lg">Skip</button>
          </div>
        </div>

        <div className="glass-panel p-6 md:p-12 w-full max-w-4xl mb-8 md:mb-12 flex items-center justify-center min-h-[150px] md:min-h-[300px] shadow-xl">
          <h2 className="text-2xl md:text-4xl font-bold text-center leading-tight">{question?.text}</h2>
        </div>

        <div className="answer-grid max-w-6xl w-full">
          {question?.options.map((opt: any, index: number) => {
            const shapes = [
              <svg key="triangle" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L22 20H2L12 2Z"/></svg>,
              <svg key="diamond" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L22 12L12 22L2 12L12 2Z"/></svg>,
              <svg key="circle" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>,
              <svg key="square" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
            ];
            return (
              <div
                key={opt.id}
                className={`answer-btn ${colors[index % 4]} flex items-center justify-between px-4 md:px-8 cursor-default pointer-events-none text-lg md:text-2xl`}
              >
                <div className="drop-shadow-md scale-75 md:scale-100">{shapes[index % 4]}</div>
                <span className="font-bold flex-1 text-center drop-shadow-md">{opt.text}</span>
                <div className="w-8 md:w-12"></div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderResult = () => {
    const colors = ['color-red', 'color-blue', 'color-yellow', 'color-green'];

    return (
      <div className="flex flex-col items-center w-full min-h-screen p-4 md:p-8 justify-between">
        <div className="w-full max-w-6xl flex justify-between items-center mb-4">
          <h2 className="text-3xl md:text-4xl font-bold">Results</h2>
          <button onClick={handleNext} className="btn-primary text-lg md:text-xl py-2 px-6 md:py-3 md:px-8">
            Next
          </button>
        </div>

        <div className="flex-1 w-full flex items-end justify-center gap-2 md:gap-12 mb-8 md:mb-12 max-w-6xl mt-4 md:mt-8 px-2 md:px-0">
          {question?.options.map((opt: any, index: number) => {
            const count = results?.answerCounts?.[opt.id] || 0;
            const isCorrect = results?.correctOptionId === opt.id;
            const maxCount = Math.max(...(Object.values(results?.answerCounts || {0:0}) as number[]), 1);
            const heightPercent = maxCount === 0 ? 0 : (count / maxCount) * 100;

            return (
              <div key={opt.id} className="flex flex-col items-center flex-1 h-[300px] md:h-[450px] justify-end relative">
                <div className="text-2xl md:text-5xl font-black mb-4 drop-shadow-lg">{count}</div>
                <div 
                  className={`w-full rounded-t-xl transition-all duration-1000 ease-out flex flex-col items-center justify-start pt-4 md:pt-8 ${colors[index % 4]} ${!isCorrect && 'opacity-50 grayscale-[30%]'} shadow-2xl relative overflow-hidden`}
                  style={{ height: `${Math.max(heightPercent, 5)}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  <div className="relative z-10">
                    {isCorrect ? (
                      <svg className="drop-shadow-lg text-white mb-2" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    ) : (
                      <svg className="drop-shadow-lg text-white/50 mb-2 scale-75" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="w-full max-w-6xl grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
           {question?.options.map((opt: any, index: number) => {
             const shapes = [
               <svg key="triangle" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L22 20H2L12 2Z"/></svg>,
               <svg key="diamond" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L22 12L12 22L2 12L12 2Z"/></svg>,
               <svg key="circle" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>,
               <svg key="square" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
             ];
             return (
               <div key={opt.id} className={`p-4 md:p-6 rounded-xl flex items-center justify-between shadow-lg ${colors[index % 4]} ${results?.correctOptionId !== opt.id ? 'opacity-50 grayscale-[30%]' : 'ring-4 ring-white/50'}`}>
                 <div className="drop-shadow-md">{shapes[index % 4]}</div>
                 <span className="font-bold text-lg md:text-xl text-center flex-1 px-4 line-clamp-2 leading-tight drop-shadow-md">{opt.text}</span>
               </div>
             )
           })}
        </div>
      </div>
    );
  };

  const renderLeaderboard = () => (
    <div className="flex flex-col items-center w-full min-h-screen p-4 md:p-8">
      <h2 className="text-4xl md:text-6xl font-black mb-12 md:mb-16 mt-8 md:mt-12 text-yellow-400 drop-shadow-[0_4px_15px_rgba(250,204,21,0.4)]">
        Leaderboard
      </h2>
      
      <div className="w-full max-w-4xl flex flex-col gap-4 md:gap-6 px-2 md:px-0">
        {leaderboard.map((player, index) => (
          <div 
            key={player.id} 
            className={`glass-panel p-4 md:p-6 px-6 md:px-12 flex justify-between items-center animate-fade-in shadow-xl transition-transform hover:scale-[1.02]`}
            style={{ animationDelay: `${index * 0.15}s` }}
          >
            <div className="flex items-center gap-4 md:gap-8">
              <span className={`text-3xl md:text-4xl font-black w-8 md:w-12 text-center ${index === 0 ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]' : index === 1 ? 'text-gray-300 drop-shadow-[0_0_15px_rgba(209,213,219,0.5)]' : index === 2 ? 'text-amber-600 drop-shadow-[0_0_15px_rgba(217,119,6,0.5)]' : 'text-white/50'}`}>
                {index + 1}
              </span>
              <span className="text-2xl md:text-3xl font-bold truncate max-w-[150px] md:max-w-xs">{player.name}</span>
            </div>
            <span className="text-2xl md:text-3xl font-black bg-[rgba(0,0,0,0.4)] px-4 md:px-6 py-2 rounded-xl border border-white/10">{player.score}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <main className="flex min-h-screen flex-col items-center bg-[var(--background)] w-full">
      {gameState === 'LOBBY' && renderLobby()}
      {gameState === 'QUESTION' && renderQuestion()}
      {gameState === 'RESULT' && renderResult()}
      {gameState === 'LEADERBOARD' && renderLeaderboard()}
    </main>
  );
}
