// src/app/features/template-list/template-list.component.ts
import { Component, OnInit } from '@angular/core';
import { FormTemplateService, FormTemplate } from '../../core/services/form-template.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-template-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './template-list.component.html',
  styleUrls: ['./template-list.component.scss']
})
export class TemplateListComponent implements OnInit {
  templates: FormTemplate[] = [];
  loading = true;
  isAdmin = false; // implementar verificação real via AuthService

  constructor(private service: FormTemplateService) {}

  ngOnInit(): void {
    // Para testes vamos assumir isAdmin=true
    this.isAdmin = true;
    const obs = this.isAdmin ? this.service.getAllTemplates() : this.service.getMyTemplates();

    obs.subscribe({
      next: (res) => {
        this.templates = res;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }
}