import { Component, OnInit, signal } from '@angular/core';
import { FormTemplateService, FormTemplate, FormField } from '../../core/services/form-template.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forms-all',
  imports: [RouterLink],
  templateUrl: './forms-all.component.html',
  styleUrls: ['./forms-all.component.scss'],
  standalone: true
})
export class FormsAllComponent implements OnInit {

  templates = signal<FormTemplate[]>([]); // array de templates
  loading = signal<boolean>(true); // sinal de loading correto

  constructor(private templateService: FormTemplateService) {}

  ngOnInit(): void {
    this.loadTemplates();
  }

  loadTemplates() {
    this.loading.set(true);
    this.templateService.getAllTemplates().subscribe({
      next: (data) => {
        this.templates.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erro ao carregar templates', err);
        this.loading.set(false);
      }
    });
  }
}