import { Injectable } from '@nestjs/common';
import { GameSession, Question, Player } from './game.types';

@Injectable()
export class GameService {
  private sessions: Map<string, GameSession> = new Map();

  createSession(adminId: string, questions: Question[]): string {
    const pin = this.generatePin();
    this.sessions.set(pin, {
      id: pin, // using pin as ID for simplicity
      pin,
      adminId,
      questions,
      currentQuestionIndex: -1,
      players: {},
      state: 'LOBBY',
      answers: {},
    });
    return pin;
  }

  getSession(pin: string): GameSession | undefined {
    return this.sessions.get(pin);
  }

  addPlayer(pin: string, playerId: string, name: string): Player | null {
    const session = this.getSession(pin);
    if (!session || session.state !== 'LOBBY') return null;

    const newPlayer: Player = { id: playerId, name, score: 0 };
    session.players[playerId] = newPlayer;
    return newPlayer;
  }

  removePlayer(playerId: string) {
    for (const [pin, session] of this.sessions.entries()) {
      if (session.players[playerId]) {
        delete session.players[playerId];
        return { pin, session };
      }
    }
    return null;
  }

  removeSessionByAdmin(adminId: string) {
    for (const [pin, session] of this.sessions.entries()) {
      if (session.adminId === adminId) {
        this.sessions.delete(pin);
        return pin;
      }
    }
    return null;
  }

  startGame(pin: string): GameSession | null {
    const session = this.getSession(pin);
    if (!session || session.state !== 'LOBBY') return null;
    session.state = 'QUESTION';
    session.currentQuestionIndex = 0;
    session.timerStart = Date.now();
    session.timerDuration = 25000; // 25 seconds
    session.answers = {};
    return session;
  }

  nextQuestion(pin: string): GameSession | null {
    const session = this.getSession(pin);
    if (!session) return null;
    
    session.currentQuestionIndex++;
    if (session.currentQuestionIndex >= session.questions.length) {
      session.state = 'LEADERBOARD';
    } else {
      session.state = 'QUESTION';
      session.timerStart = Date.now();
      session.timerDuration = 25000;
      session.answers = {};
    }
    return session;
  }

  showResults(pin: string): GameSession | null {
    const session = this.getSession(pin);
    if (!session) return null;
    
    session.state = 'RESULT';
    session.timerStart = Date.now();
    session.timerDuration = 15000; // 15 seconds
    return session;
  }

  submitAnswer(pin: string, playerId: string, optionId: string): boolean {
    const session = this.getSession(pin);
    if (!session || session.state !== 'QUESTION') return false;
    
    if (session.answers[playerId]) return false; // Already answered

    const timeTaken = Date.now() - (session.timerStart || 0);
    session.answers[playerId] = { playerId, optionId, timeTaken };

    // Calculate score
    const currentQuestion = session.questions[session.currentQuestionIndex];
    const option = currentQuestion.options.find(o => o.id === optionId);
    
    if (option && option.isCorrect) {
      // Speed-based scoring: max 1000, min 500 based on time. Max time = 25000ms
      const maxTime = session.timerDuration || 25000;
      const score = Math.max(500, Math.round(1000 * (1 - (timeTaken / maxTime) / 2)));
      if (session.players[playerId]) {
        session.players[playerId].score += score;
      }
    }

    return true;
  }

  private generatePin(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
