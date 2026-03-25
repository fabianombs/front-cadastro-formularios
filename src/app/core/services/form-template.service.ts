// src/app/core/services/form-template.service.ts
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FormField {
  label: string;
  type: string;
  required: boolean;
}

export interface FormTemplate {
  id: number;
  name: string;
  slug: string;
  fields: FormField[];
}

export interface CreateFormTemplateRequest {
  name: string;
  clientId: number;
  fields: FormField[];
}

export interface FormSubmission {
  id: number;
  templateId: number;
  data: { label: string; value: string }[];
  submittedAt: string;
}

export interface CreateFormSubmissionRequest {
  templateId: number;
  data: { label: string; value: string }[];
}

@Injectable({ providedIn: 'root' })
export class FormTemplateService {
  private apiUrl = 'http://localhost:8080/form-templates';
  private submissionsUrl = 'http://localhost:8080/form-submissions';

  constructor(private http: HttpClient) {}

  // Templates
  createTemplate(clientId: number, payload: CreateFormTemplateRequest): Observable<FormTemplate> {
    return this.http.post<FormTemplate>(`${this.apiUrl}/create/${clientId}`, payload);
  }

  getAllTemplates(): Observable<FormTemplate[]> {
    return this.http.get<FormTemplate[]>(this.apiUrl);
  }

  getMyTemplates(): Observable<FormTemplate[]> {
    return this.http.get<FormTemplate[]>(`${this.apiUrl}/my-templates`);
  }

  getTemplateBySlug(slug: string): Observable<FormTemplate> {
    return this.http.get<FormTemplate>(`${this.apiUrl}/slug/${slug}`);
  }

  // Submissions
  submitForm(payload: CreateFormSubmissionRequest): Observable<FormSubmission> {
    return this.http.post<FormSubmission>(this.submissionsUrl, payload);
  }

  getSubmissions(templateId: number): Observable<FormSubmission[]> {
    return this.http.get<FormSubmission[]>(`${this.submissionsUrl}?templateId=${templateId}`);
  }
}