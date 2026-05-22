import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';


// ── Interfaces ────────────────────────────────────────────────────────────────

export interface QuizOption {
  id: number;
  optionText: string;
  orderIndex: number;
  correct: boolean | null; // null na visão pública
}

export interface QuizQuestion {
  id: number;
  question: string;
  imageUrl: string | null;
  orderIndex: number;
  options: QuizOption[];
}

export interface QuizConfig {
  id: number;
  name: string;
  slug: string;
  timePerQuestion: number;
  pointsPerQuestion: number;
  active: boolean;
  totalQuestions: number;
  questions: QuizQuestion[];
  quizLink: string;
  rankingLink: string;
  // Aparência visual do quiz público
  backgroundColor?: string | null;
  backgroundGradient?: string | null;
  backgroundImageUrl?: string | null;
  primaryColor?: string | null;
  textColor?: string | null;
  // Cor de fundo dos cards de opção — null usa o padrão glassmorphism
  cardColor?: string | null;
}

export interface QuizSession {
  id: number;
  playerName: string;
  playerContact: string;
  totalScore: number;
  correctAnswers: number;
  totalQuestions: number;
  completed: boolean;
  completedAt: string | null;
  rankPosition: number | null;
}

export interface AnswerResult {
  correct: boolean;
  correctOptionId: number;
  pointsEarned: number;
  totalScore: number;
}

export interface RankingResponse {
  templateName: string;
  totalParticipants: number;
  top: QuizSession[];
}

export interface QuizOptionRequest {
  optionText: string;
  correct: boolean;
  orderIndex: number;
}

export interface QuizQuestionRequest {
  question: string;
  imageUrl: string | null;
  orderIndex: number;
  options: QuizOptionRequest[];
}

export interface QuizConfigRequest {
  name?: string;
  slug?: string;
  timePerQuestion: number;
  pointsPerQuestion: number;
  questions: QuizQuestionRequest[];
  // Aparência visual — opcionais
  backgroundColor?: string | null;
  backgroundGradient?: string | null;
  backgroundImageUrl?: string | null;
  primaryColor?: string | null;
  textColor?: string | null;
  cardColor?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// O backend gera os links com o host de onde está rodando (pode ser localhost:4200).
// Esta função garante que o link sempre use o origin atual do browser (ex: nexventa.com.br em prod).
export function normalizeQuizLink(link: string | null | undefined): string | null {
  if (!link) return null; // preserva null/undefined — não afeta formulários sem quiz
  try {
    const parsed = new URL(link);
    return window.location.origin + parsed.pathname + parsed.search + parsed.hash;
  } catch {
    // Se não for uma URL válida, trata como path relativo
    return window.location.origin + (link.startsWith('/') ? link : '/' + link);
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class QuizService {
  private api = `${environment.apiUrl}/quizzes`;

  constructor(private http: HttpClient) {}

  // ── Admin: CRUD de quizzes independentes ──────────────────────────────────

  listAll(): Observable<QuizConfig[]> {
    return this.http.get<QuizConfig[]>(this.api);
  }

  createQuiz(payload: QuizConfigRequest): Observable<QuizConfig> {
    return this.http.post<QuizConfig>(this.api, payload);
  }

  getQuizById(quizId: number): Observable<QuizConfig> {
    return this.http.get<QuizConfig>(`${this.api}/${quizId}`);
  }

  updateQuiz(quizId: number, payload: QuizConfigRequest): Observable<QuizConfig> {
    return this.http.put<QuizConfig>(`${this.api}/${quizId}`, payload);
  }

  deleteQuiz(quizId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${quizId}`);
  }

  toggleActive(quizId: number): Observable<QuizConfig> {
    return this.http.patch<QuizConfig>(`${this.api}/${quizId}/toggle`, {});
  }

  // ── Admin: associação quiz ↔ template ─────────────────────────────────────

  assignToTemplate(quizId: number, templateId: number): Observable<void> {
    return this.http.post<void>(`${this.api}/${quizId}/assign/${templateId}`, {});
  }

  unassignFromTemplate(templateId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/unassign/${templateId}`);
  }

  // ── Admin: ranking e relatório ────────────────────────────────────────────

  getAdminReport(quizId: number): Observable<RankingResponse> {
    return this.http.get<RankingResponse>(`${this.api}/${quizId}/report`);
  }

  resetRanking(quizId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${quizId}/ranking`);
  }

  // ── Público: acesso pelo slug ─────────────────────────────────────────────

  getQuizBySlug(slug: string): Observable<QuizConfig> {
    return this.http.get<QuizConfig>(`${this.api}/slug/${slug}`);
  }

  startSession(slug: string, playerName: string, playerContact: string): Observable<QuizSession> {
    return this.http.post<QuizSession>(`${this.api}/slug/${slug}/sessions`, { playerName, playerContact });
  }

  submitAnswer(sessionId: number, questionId: number, optionId: number | null, timeTakenMs: number): Observable<AnswerResult> {
    return this.http.post<AnswerResult>(`${this.api}/sessions/${sessionId}/answers`, { questionId, optionId, timeTakenMs });
  }

  completeSession(sessionId: number): Observable<QuizSession> {
    return this.http.post<QuizSession>(`${this.api}/sessions/${sessionId}/complete`, {});
  }

  // Upload de imagem reutilizando o endpoint existente
  uploadImage(file: File): Observable<{ url: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ url: string }>(`${environment.apiUrl}/uploads/image`, form);
  }

  getRanking(slug: string, top = 10): Observable<RankingResponse> {
    return this.http.get<RankingResponse>(`${this.api}/slug/${slug}/ranking?top=${top}`);
  }
}
