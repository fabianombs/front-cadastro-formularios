import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SurveyConfig {
  id: number;
  name: string;
  slug: string;
  companyName?: string;
  companyLogoUrl?: string;
  welcomeTitle: string;
  questionText: string;
  showComment: boolean;
  thankYouMsg: string;
  active: boolean;
  publicLink?: string;
  reportLink?: string;
  createdAt?: string;
  updatedAt?: string;
  // Aparência visual
  backgroundColor?: string | null;
  backgroundGradient?: string | null;
  backgroundImageUrl?: string | null;
  primaryColor?: string | null;
  textColor?: string | null;
  cardColor?: string | null;
  buttonColor?: string | null;
  buttonTextColor?: string | null;
  logoBorderRadius?: string | null;
  // Posições livres (% do container)
  logoPosX?: number | null;
  logoPosY?: number | null;
  logoWidth?: number | null;
  cardPosX?: number | null;
  cardPosY?: number | null;
  // Visibilidade do logo por tela
  showLogoWelcome?: boolean;
  showLogoRating?: boolean;
  showLogoThankyou?: boolean;
  // Ícones customizados por score (null = emoji padrão)
  score5ImageUrl?: string | null;
  score4ImageUrl?: string | null;
  score3ImageUrl?: string | null;
  score2ImageUrl?: string | null;
  score1ImageUrl?: string | null;
  // Labels editáveis por score
  score5Label?: string;
  score4Label?: string;
  score3Label?: string;
  score2Label?: string;
  score1Label?: string;
  // Subtítulos e botões editáveis
  welcomeSubtitle?: string;
  thankyouSubtitle?: string;
  welcomeBtnText?: string;
  ratingBtnText?: string;
}

export interface SubmitSurveyRequest {
  score: number;
  comment?: string;
  respondentRef?: string;
  sourceTemplateSlug?: string;
}

export interface SurveyResponseItem {
  id: number;
  score: number;
  scoreLabel: string;
  comment?: string;
  respondentRef?: string;
  sourceTemplateSlug?: string;
  createdAt: string;
}

export interface SurveyReport {
  surveyId: number;
  surveyName: string;
  totalResponses: number;
  averageScore: number;
  scoreDistribution: Record<string, number>;
  responses: SurveyResponseItem[];
}

@Injectable({ providedIn: 'root' })
export class SurveyService {
  private http = inject(HttpClient);
  private api  = environment.apiUrl;

  // ── Admin ─────────────────────────────────────────────────────────────────

  listAll(): Observable<SurveyConfig[]> {
    return this.http.get<SurveyConfig[]>(`${this.api}/surveys`);
  }

  create(data: Partial<SurveyConfig>): Observable<SurveyConfig> {
    return this.http.post<SurveyConfig>(`${this.api}/surveys`, data);
  }

  getById(id: number): Observable<SurveyConfig> {
    return this.http.get<SurveyConfig>(`${this.api}/surveys/${id}`);
  }

  update(id: number, data: Partial<SurveyConfig>): Observable<SurveyConfig> {
    return this.http.put<SurveyConfig>(`${this.api}/surveys/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/surveys/${id}`);
  }

  toggleActive(id: number): Observable<SurveyConfig> {
    return this.http.patch<SurveyConfig>(`${this.api}/surveys/${id}/toggle`, {});
  }

  getReport(id: number): Observable<SurveyReport> {
    return this.http.get<SurveyReport>(`${this.api}/surveys/${id}/report`);
  }

  // ── Público ───────────────────────────────────────────────────────────────

  getBySlug(slug: string): Observable<SurveyConfig> {
    return this.http.get<SurveyConfig>(`${this.api}/surveys/slug/${slug}`);
  }

  submitResponse(slug: string, payload: SubmitSurveyRequest): Observable<void> {
    return this.http.post<void>(`${this.api}/surveys/slug/${slug}/responses`, payload);
  }

  // Vincula survey a um template
  assignToTemplate(surveyId: number, templateId: number): Observable<void> {
    return this.http.put<void>(`${this.api}/form-templates/${templateId}`, { surveyConfigId: surveyId });
  }

  // Desvincula survey de um template
  unassignFromTemplate(templateId: number): Observable<void> {
    return this.http.put<void>(`${this.api}/form-templates/${templateId}`, { surveyConfigId: 0 });
  }

  // Upload de imagem de fundo (reutiliza o endpoint genérico)
  uploadImage(file: File): Observable<{ url: string }> {
    const form = new FormData();
    form.append('file', file);
    // Reutiliza o mesmo endpoint de upload do quiz — requer autenticação
    return this.http.post<{ url: string }>(`${this.api}/uploads/image`, form);
  }
}
