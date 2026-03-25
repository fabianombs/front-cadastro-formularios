import { Component, OnInit, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormTemplateService, FormTemplate, FormField } from '../../core/services/form-template.service';

@Component({
  selector: 'app-form-dynamic',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './form-dynamic.component.html',
  styleUrls: ['./form-dynamic.component.scss']
})
export class FormDynamicComponent implements OnInit {

  public template = signal<FormTemplate | null>(null);
  public loading = signal<boolean>(false);
  public form: FormGroup;
  public formFields = signal<FormGroup[]>([]);

  constructor(
    private route: ActivatedRoute,
    private service: FormTemplateService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({});
  }

  ngOnInit(): void {
    this.loading.set(true);

    const slug = this.route.snapshot.params['slug'];
    if (slug) {
      this.service.getTemplateBySlug(slug).subscribe({
        next: (template) => {
          this.template.set(template);
          this.buildForm(template.fields);
          this.loading.set(false);
        },
        error: () => {
          alert('Erro ao carregar o formulário');
          this.loading.set(false);
        }
      });
    }
  }

  private buildForm(fields: FormField[]) {
    const fgArray: FormGroup[] = fields.map(f =>
      this.fb.group({
        label: [f.label],
        type: [f.type],
        value: ['', f.required ? Validators.required : []],
        required: [f.required ?? false]
      })
    );

    // Armazena os fields no Signal
    this.formFields.set(fgArray);

    // Adiciona controles no FormGroup principal para submit
    fgArray.forEach((fg, i) => {
      const control = fg.get('value') as FormControl;
      this.form.addControl(`field_${i}`, control);
    });

    this.cdr.detectChanges();
  }

  public submit() {
    if (this.form.invalid) {
      alert('Preencha todos os campos obrigatórios!');
      return;
    }

    const payload = this.formFields().map((fg, i) => ({
      label: fg.value.label,
      type: fg.value.type,
      value: (this.form.get(`field_${i}`) as FormControl).value
    }));

    console.log('Dados enviados:', payload);

    if (this.template()) {
      this.service.submitForm({
        templateId: this.template()!.id,
        data: payload
      }).subscribe({
        next: () => {
          alert('Formulário enviado com sucesso!');
          this.form.reset();
        },
        error: () => alert('Erro ao enviar formulário')
      });
    }
  }

  public getControl(index: number): FormControl {
    return this.form.get(`field_${index}`) as FormControl;
  }
}