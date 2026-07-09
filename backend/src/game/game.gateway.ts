import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { Question } from './game.types';

@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly gameService: GameService) {}

  handleDisconnect(client: Socket) {
    // Check if it's an admin
    const removedSessionPin = this.gameService.removeSessionByAdmin(client.id);
    if (removedSessionPin) {
      this.server.to(removedSessionPin).emit('session_closed');
      return;
    }

    // Check if it's a player
    const result = this.gameService.removePlayer(client.id);
    if (result) {
      this.server.to(result.pin).emit('player_left', client.id);
      this.server.to(result.pin).emit('update_players', Object.values(result.session.players));
    }
  }

  @SubscribeMessage('create_session')
  handleCreateSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { questions: Question[] },
  ) {
    const pin = this.gameService.createSession(client.id, data.questions);
    client.join(pin);
    return { status: 'success', pin };
  }

  @SubscribeMessage('join_session')
  handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { pin: string; name: string },
  ) {
    const player = this.gameService.addPlayer(data.pin, client.id, data.name);
    if (player) {
      client.join(data.pin);
      const session = this.gameService.getSession(data.pin);
      if (session) {
        this.server.to(data.pin).emit('update_players', Object.values(session.players));
      }
      return { status: 'success', player };
    }
    return { status: 'error', message: 'Session not found or already started' };
  }

  @SubscribeMessage('start_game')
  handleStartGame(@ConnectedSocket() client: Socket, @MessageBody() data: { pin: string }) {
    const session = this.gameService.startGame(data.pin);
    if (session && session.adminId === client.id) {
      this.server.to(data.pin).emit('game_started');
      this.emitQuestion(data.pin);
    }
  }

  @SubscribeMessage('next_question')
  handleNextQuestion(@ConnectedSocket() client: Socket, @MessageBody() data: { pin: string }) {
    const session = this.gameService.getSession(data.pin);
    if (session && session.adminId === client.id) {
      const updatedSession = this.gameService.nextQuestion(data.pin);
      if (updatedSession) {
        if (updatedSession.state === 'LEADERBOARD') {
          this.server.to(data.pin).emit('show_leaderboard', Object.values(updatedSession.players).sort((a, b) => b.score - a.score));
        } else {
          this.emitQuestion(data.pin);
        }
      }
    }
  }

  @SubscribeMessage('skip_question_time')
  handleSkipTime(@ConnectedSocket() client: Socket, @MessageBody() data: { pin: string }) {
    const session = this.gameService.getSession(data.pin);
    if (session && session.adminId === client.id && session.state === 'QUESTION') {
      this.emitResults(data.pin);
    }
  }

  @SubscribeMessage('submit_answer')
  handleSubmitAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { pin: string; optionId: string },
  ) {
    const success = this.gameService.submitAnswer(data.pin, client.id, data.optionId);
    if (success) {
      // Notify admin that someone answered
      const session = this.gameService.getSession(data.pin);
      if (session) {
        this.server.to(session.adminId).emit('player_answered', { playerId: client.id });
      }
    }
  }

  private emitQuestion(pin: string) {
    const session = this.gameService.getSession(pin);
    if (!session) return;

    const currentQuestion = session.questions[session.currentQuestionIndex];
    // Don't send which is correct to the clients during the question phase
    const sanitizedOptions = currentQuestion.options.map(o => ({ id: o.id, text: o.text }));
    
    this.server.to(pin).emit('new_question', {
      question: { id: currentQuestion.id, text: currentQuestion.text, options: sanitizedOptions },
      questionIndex: session.currentQuestionIndex,
      totalQuestions: session.questions.length,
      timeLimit: 25000,
    });

    // Schedule showing results after 25 seconds
    setTimeout(() => {
      const activeSession = this.gameService.getSession(pin);
      if (activeSession && activeSession.state === 'QUESTION' && activeSession.currentQuestionIndex === session.currentQuestionIndex) {
        this.emitResults(pin);
      }
    }, 25000);
  }

  private emitResults(pin: string) {
    const session = this.gameService.showResults(pin);
    if (!session) return;

    const currentQuestion = session.questions[session.currentQuestionIndex];
    
    // Count answers per option
    const answerCounts: Record<string, number> = {};
    currentQuestion.options.forEach(o => answerCounts[o.id] = 0);
    Object.values(session.answers).forEach(ans => {
      if (answerCounts[ans.optionId] !== undefined) {
        answerCounts[ans.optionId]++;
      }
    });

    this.server.to(pin).emit('show_results', {
      correctOptionId: currentQuestion.options.find(o => o.isCorrect)?.id,
      answerCounts,
      leaderboardPreview: Object.values(session.players).sort((a, b) => b.score - a.score).slice(0, 5)
    });
  }
}
