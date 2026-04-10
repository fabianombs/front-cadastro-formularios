# App Forms Clients

Plataforma web para criação, gerenciamento e preenchimento de formulários dinâmicos vinculados a clientes. Desenvolvida em **Angular 21** com arquitetura standalone, roteamento lazy-loaded e autenticação baseada em JWT.

---

## Índice

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e Execução](#instalação-e-execução)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Fluxo da Aplicação](#fluxo-da-aplicação)
- [Controle de Acesso (RBAC)](#controle-de-acesso-rbac)
- [Rotas](#rotas)
- [Serviços Principais](#serviços-principais)
- [Testes](#testes)
- [Build e Deploy](#build-e-deploy)

---

## Visão Geral

O **App Forms Clients** permite que administradores e funcionários criem formulários personalizados para seus clientes. Cada formulário pode ser:

- **Formulário simples** — coleta de dados via campos dinâmicos
- **Formulário com agendamento** — exibe slots de horário disponíveis para reserva
- **Lista de presença** — importação e controle de presença via planilha Excel

Os formulários gerados possuem uma URL pública com slug único, acessível sem autenticação pelo cliente final.

---

## Funcionalidades

| Funcionalidade | Papéis com acesso |
|---|---|
| Login e cadastro de usuários | Público |
| Preenchimento de formulário por slug | Público |
| Dashboard com KPIs e gráficos | Admin, Funcionário, Cliente |
| Gerenciamento de clientes | Admin, Funcionário |
| Criação e edição de templates | Admin |
| Agendamentos e slots de horário | Admin, Funcionário |
| Lista de presença com importação Excel | Admin, Funcionário |
| Gerenciamento de usuários | Admin, Funcionário |
| Exportação de dados para Excel | Admin, Funcionário |
| Alternância de tema (dark/light) | Todos |

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Framework | Angular 21 (Standalone Components) |
| Linguagem | TypeScript 5.9 (strict mode) |
| Estado reativo | Angular Signals (`signal`, `computed`, `effect`) |
| Formulários | Reactive Forms (`FormBuilder`, `Validators`) |
| Estilização | Bootstrap 5.3 + SCSS customizado |
| Notificações | ngx-toastr |
| Gráficos | Chart.js + ng2-charts |
| Drag & Drop | @angular/cdk |
| Planilhas | xlsx (SheetJS) |
| Testes | Vitest + Angular Testing Utilities |
| Build | @angular/build (Vite/esbuild) |

---

## Arquitetura

A aplicação segue a estrutura **Core / Features / Shared** recomendada pelo Angular Style Guide:

```
src/app/
├── core/           → Serviços singleton, guards, interceptors e modelos globais
├── features/       → Módulos de funcionalidades (lazy-loaded via loadComponent)
└── shared/         → Componentes, diretivas e pipes reutilizáveis
```

### Padrões adotados

- **Standalone Components** — sem NgModules, cada componente declara seus próprios imports
- **Lazy Loading** — todos os componentes de rota usam `loadComponent()` para code splitting
- **Signals** — estado local e derivado gerenciado com `signal()` e `computed()`, sem Subjects
- **Functional Guards/Interceptors** — guards e interceptors como funções puras (`CanActivateFn`, `HttpInterceptorFn`)
- **`inject()`** — injeção de dependências via função nos componentes e serviços standalone

---

## Estrutura de Pastas

```
app-forms-clients/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── guards/
│   │   │   │   ├── auth.guard.ts          # Guard de autenticação + RBAC
│   │   │   │   └── clients.guard.ts       # Guard específico para área de clientes
│   │   │   ├── interceptors/
│   │   │   │   └── auth.interceptor.ts    # Injeta JWT e trata erro 401
│   │   │   ├── models/
│   │   │   │   ├── auth.model.ts          # Interface AuthResponse
│   │   │   │   ├── jwt.model.ts           # Interface JwtPayload
│   │   │   │   └── page-response.model.ts # Interface PageResponse<T> (Spring Page)
│   │   │   └── services/
│   │   │       ├── auth.service.ts        # Autenticação, JWT, Signals de sessão
│   │   │       ├── client.service.ts      # CRUD de clientes
│   │   │       ├── dashboard.service.ts   # Dados do painel principal
│   │   │       ├── export.service.ts      # Exportação/importação de planilhas
│   │   │       ├── form-template.service.ts # Templates, submissões, agendamentos, presença
│   │   │       ├── FormValidation.service.ts # Validators dinâmicos e mensagens de erro
│   │   │       ├── message.service.ts     # Wrapper do ngx-toastr
│   │   │       ├── theme.service.ts       # Tema dark/light com persistência
│   │   │       └── user.service.ts        # CRUD de usuários
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   ├── login/                 # Tela de login
│   │   │   │   └── register/              # Tela de cadastro
│   │   │   ├── cliente/
│   │   │   │   ├── cliente.component.ts   # Listagem de clientes com filtros
│   │   │   │   └── create-client/         # Formulário de criação de cliente
│   │   │   ├── create-form-template/      # Builder de templates com drag-and-drop
│   │   │   ├── form-dynamic/              # Preenchimento público de formulário por slug
│   │   │   ├── forms-all/                 # Lista de todos os formulários
│   │   │   ├── home/                      # Dashboard com KPIs e gráficos
│   │   │   ├── main-layout/               # Layout protegido (header + router-outlet)
│   │   │   ├── template-list/             # Lista de templates (admin e público)
│   │   │   ├── template-submission/       # Visualização de submissões de um template
│   │   │   └── users/                     # Gerenciamento de usuários
│   │   ├── shared/
│   │   │   ├── components/
│   │   │   │   ├── confirm-modal/         # Modal de confirmação genérico
│   │   │   │   ├── data-table/            # Tabela reutilizável com colunas configuráveis
│   │   │   │   ├── footer/                # Rodapé da aplicação
│   │   │   │   ├── form-field/            # Campo de formulário com validação integrada
│   │   │   │   ├── header/                # Cabeçalho com navegação e toggle de tema
│   │   │   │   ├── image-position-modal/  # Modal para posicionamento de imagens
│   │   │   │   ├── input/                 # Input reutilizável
│   │   │   │   ├── page-header/           # Cabeçalho de página com título e ações
│   │   │   │   ├── page-shell/            # Shell container para páginas internas
│   │   │   │   └── pagination/            # Componente de paginação (Spring Page)
│   │   │   └── validators/                # Validators customizados reutilizáveis
│   │   ├── app.ts                         # Componente raiz
│   │   ├── app.routes.ts                  # Definição de rotas
│   │   └── app.config.ts                  # Configuração da aplicação (providers)
│   ├── environments/
│   │   ├── environment.ts                 # Config de desenvolvimento (proxy /api)
│   │   └── environment.prod.ts            # Config de produção (URL do servidor)
│   └── styles.scss                        # Estilos globais e variáveis CSS
├── angular.json                           # Configuração do Angular CLI
├── tsconfig.json                          # Configuração TypeScript base
└── proxy.conf.json                        # Proxy de desenvolvimento → back-end Spring
```

---

## Pré-requisitos

- **Node.js** >= 20.x
- **npm** >= 11.x
- **Angular CLI** >= 21.x (`npm install -g @angular/cli`)
- Back-end Spring Boot rodando em `http://localhost:8080` (para desenvolvimento)

---

## Instalação e Execução

```bash
# 1. Clone o repositório
git clone <url-do-repositorio>
cd app-forms-clients

# 2. Instale as dependências
npm install

# 3. Inicie o servidor de desenvolvimento
npm start
# ou
ng serve
```

Acesse em `http://localhost:4200`.

O proxy de desenvolvimento está configurado em `proxy.conf.json` e redireciona todas as chamadas de `/api/*` para `http://localhost:8080`.

---

## Variáveis de Ambiente

As configurações de ambiente estão em `src/environments/`:

| Arquivo | Quando usado | `apiUrl` |
|---|---|---|
| `environment.ts` | Desenvolvimento (`ng serve`) | `/api` (via proxy) |
| `environment.prod.ts` | Produção (`ng build`) | `https://seu-servidor.com` |

Para criar um novo ambiente (ex: staging), adicione o arquivo e registre-o em `angular.json` > `configurations`.

---

## Fluxo da Aplicação

### 1. Autenticação

```
Usuário → /login → AuthService.login() → JWT recebido
       → AuthService.setSession(token) → localStorage + Signal atualizado
       → Redirecionado para / (Dashboard)
```

O `authInterceptor` adiciona automaticamente `Authorization: Bearer <token>` em todas as requisições HTTP subsequentes. Em caso de resposta `401`, o interceptor chama `AuthService.logout()` e redireciona para `/login`.

### 2. Criação de Formulário Template (Admin)

```
/form-builder → CreateTemplateComponent
  ↓ Seleciona cliente
  ↓ Adiciona campos via drag-and-drop
  ↓ Configura aparência (cores, fontes, imagens)
  ↓ (Opcional) Configura agendamento (slots, capacidade, deduplicação)
  ↓ FormTemplateService.createTemplate()
  → Template criado com slug único
  → URL pública: /forms/{slug}
```

### 3. Preenchimento de Formulário (Cliente Final — sem login)

```
/forms/{slug} → FormDynamicComponent
  ↓ FormTemplateService.getTemplateBySlug(slug)
  ↓ Renderiza campos dinamicamente conforme template
  ↓ Se hasSchedule → exibe calendário com slots disponíveis
  ↓ Usuário preenche e envia
  ↓ FormTemplateService.submitForm() ou bookAppointment()
  → Confirmação exibida
```

### 4. Visualização de Submissões (Admin/Funcionário)

```
/forms → TemplateListComponent → seleciona template
  ↓ TemplateSubmissionComponent
  ↓ Carrega submissões paginadas via FormTemplateService
  ↓ Exibe tabela com dados coletados
  ↓ ExportService.exportSubmissions() → download .xlsx
```

### 5. Lista de Presença

```
Admin importa planilha Excel → ExportService.readExcelFile()
  ↓ FormTemplateService.importAttendance()
  ↓ Lista exibida no TemplateSubmissionComponent
  ↓ Admin marca presença → FormTemplateService.markAttendance()
  ↓ Exporta relatório → ExportService.exportAttendance()
```

---

## Controle de Acesso (RBAC)

A aplicação utiliza três papéis de usuário, definidos no payload do JWT:

| Papel | Descrição | Acesso |
|---|---|---|
| `ROLE_ADMIN` | Administrador total | Todas as funcionalidades |
| `ROLE_FUNCIONARIO` | Operador da plataforma | Clientes, formulários, agendamentos, presença |
| `ROLE_CLIENT` | Cliente final (interno) | Dashboard, visualização de formulários |

O controle é implementado em duas camadas:

1. **`authGuard`** — verifica autenticação e o campo `data.roles` de cada rota
2. **Back-end** — valida o token e o papel em todos os endpoints protegidos

---

## Rotas

| Rota | Componente | Acesso | Descrição |
|---|---|---|---|
| `/login` | `LoginComponent` | Público | Autenticação |
| `/register` | `RegisterComponent` | Público | Cadastro de novo usuário |
| `/forms/:slug` | `FormDynamicComponent` | Público | Preenchimento de formulário |
| `/forms/:slug/list` | `TemplateListComponent` | Público | Lista pública de formulários |
| `/` | `HomeComponent` | Autenticado | Dashboard com KPIs |
| `/clients` | `ClienteComponent` | Admin, Funcionário | Lista de clientes |
| `/clients/new` | `CreateClientComponent` | Admin, Funcionário | Criar cliente |
| `/form-builder` | `CreateTemplateComponent` | Admin, Funcionário | Criar template |
| `/form-builder/:slug` | `CreateTemplateComponent` | Admin | Editar template |
| `/forms` | `TemplateListComponent` | Autenticado | Lista de templates |
| `/forms-all` | `FormsAllComponent` | Autenticado | Todos os formulários |
| `/users` | `UsersComponent` | Admin, Funcionário | Gerenciar usuários |

---

## Serviços Principais

### `AuthService`
Gerencia o ciclo de vida da sessão JWT usando Signals. Expõe `user`, `role` e `isAuthenticated` como computed signals.

### `FormTemplateService`
Serviço mais abrangente da aplicação. Cobre templates, submissões, agendamentos (slots, reservas, cancelamentos) e lista de presença.

### `ClientService`
CRUD de clientes com paginação Spring Page.

### `DashboardService`
Retorna KPIs globais e lista paginada de templates para o painel principal.

### `ExportService`
Exporta dados de submissões, agendamentos e presença para `.xlsx`. Também importa planilhas para a lista de presença.

### `ThemeService`
Gerencia o tema dark/light, persiste no `localStorage` e respeita `prefers-color-scheme` como fallback.

### `MessageService`
Abstração do ngx-toastr com métodos semânticos (`success`, `error`, `info`, `warning`) e configuração padrão centralizada.

### `FormValidationService`
Cria validators dinâmicos a partir de objetos de regras e gera mensagens de erro amigáveis em português.

---

## Testes

Os testes utilizam **Vitest** integrado com `@angular/build:unit-test`.

```bash
# Executar todos os testes
ng test

# Modo watch (re-executa ao salvar)
ng test --watch
```

Os arquivos de teste (`.spec.ts`) ficam no mesmo diretório de cada arquivo testado.

### Cobertura de testes

Os testes cobrem:

- **Serviços**: `AuthService`, `ClientService`, `FormTemplateService`, `DashboardService`, `UserService`, `MessageService`, `ThemeService`, `FormValidationService`
- **Guards**: `authGuard`, `clientsGuard`
- **Interceptor**: `authInterceptor`
- **Componentes**: `LoginComponent`, `RegisterComponent`, `ClienteComponent`

---

## Build e Deploy

```bash
# Build de produção
ng build
# Artefatos gerados em dist/app-forms-clients/

# Build para staging
ng build --configuration staging
```

O build de produção possui:
- Otimização e minificação automáticas
- Hash nos nomes dos arquivos para cache busting
- Code splitting por rota (lazy loading)
- Orçamentos configurados: aviso em 500 kB, erro em 1 MB (bundle inicial)

---

## Gerado com

[Angular CLI](https://github.com/angular/angular-cli) versão 21.2.3.
