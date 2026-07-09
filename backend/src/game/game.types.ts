export interface Question {
  id: string;
  text: string;
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
  }[];
}

export interface Player {
  id: string; // Socket ID
  name: string;
  score: number;
}

export type GameState = 'LOBBY' | 'QUESTION' | 'RESULT' | 'LEADERBOARD';

export interface GameSession {
  id: string;
  pin: string;
  adminId: string; // Socket ID of the admin
  questions: Question[];
  currentQuestionIndex: number;
  players: Record<string, Player>;
  state: GameState;
  timerStart?: number;
  timerDuration?: number;
  answers: Record<string, { playerId: string; optionId: string; timeTaken: number }>; // For the current question
}
