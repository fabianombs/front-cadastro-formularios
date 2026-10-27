import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { importProvidersFrom } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';
import { CreateTemplateComponent } from './create-form-template.component';

describe('CreateTemplateComponent', () => {
  let component: CreateTemplateComponent;
  let fixture: ComponentFixture<CreateTemplateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateTemplateComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', redirectTo: '' }]),
        importProvidersFrom(BrowserAnimationsModule, ToastrModule.forRoot()),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateTemplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve ser criado', () => {
    expect(component).toBeTruthy();
  });

  // ─── CEP / bloco de endereço ──────────────────────────────────────────────

  const rotulos = () => component.fields.controls.map((c) => c.get('label')?.value);
  const tipos = () => component.fields.controls.map((c) => c.get('type')?.value);

  it('addAddressBlock deve adicionar CEP e os 6 campos de endereço', () => {
    component.addAddressBlock();
    expect(rotulos()).toEqual(['CEP', 'Rua', 'Número', 'Complemento', 'Bairro', 'Cidade', 'Estado']);
    expect(tipos()[0]).toBe('cep');
  });

  it('escolher CEP na lista deve adicionar os campos de endereço logo abaixo', () => {
    component.addField(); // Nome
    component.fields.at(0).patchValue({ label: 'Nome' });
    component.addField(); // vira CEP
    component.addField(); // E-mail
    component.fields.at(2).patchValue({ label: 'E-mail', type: 'email' });

    component.fields.at(1).patchValue({ type: 'cep' });
    component.onFieldTypeChange(1, 'cep');

    expect(rotulos()).toEqual(['Nome', 'CEP', 'Rua', 'Número', 'Complemento', 'Bairro', 'Cidade', 'Estado', 'E-mail']);
  });

  it('não deve duplicar quando o formulário já tem campos de endereço após o CEP', () => {
    component.addField();
    component.addField();
    component.fields.at(0).patchValue({ label: 'Meu CEP', type: 'cep' });
    component.fields.at(1).patchValue({ label: 'Logradouro' });

    component.onFieldTypeChange(0, 'cep');

    expect(rotulos()).toEqual(['Meu CEP', 'Logradouro']);
  });

  it('não deve fazer nada ao trocar para outro tipo', () => {
    component.addField();
    component.onFieldTypeChange(0, 'cpf');
    expect(component.fields.length).toBe(1);
  });

  it('deve dar o rótulo "CEP" quando o campo ainda não tem nome', () => {
    component.addField();
    component.onFieldTypeChange(0, 'cep');
    expect(rotulos()[0]).toBe('CEP');
  });
});
