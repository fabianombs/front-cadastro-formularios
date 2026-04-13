import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, PageOrientation, BorderStyle,
  WidthType, ShadingType, VerticalAlign, PageNumber, PageBreak
} from 'docx';
import fs from 'fs';

// ── Cores ──────────────────────────────────────────────────────────────────
const AZUL_ESCURO  = '1a2744';
const AZUL_MEDIO   = '2d4a8a';
const AZUL_CLARO   = '4d8fff';
const CINZA_CLARO  = 'f5f7fa';
const BRANCO       = 'FFFFFF';

// ── Bordas ─────────────────────────────────────────────────────────────────
const borda = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const bordas = { top: borda, bottom: borda, left: borda, right: borda };
const semBorda = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const bordasSem = { top: semBorda, bottom: semBorda, left: semBorda, right: semBorda };

// ── Larguras das colunas (A4 landscape, margens 720 DXA) ──────────────────
// Largura útil: 16838 - 1440 = 15398 … mas com margem dupla: 16838 - 2*720 = 15398
const COL = [480, 2200, 4100, 3700, 640, 780, 2158]; // soma = 14058
// Usaremos margem de 700 DXA cada lado → content = 16838 - 1400 = 15438 → ajuste
// Simplificando: content width = 14058 + espaço de header
const TABLE_W = COL.reduce((a, b) => a + b, 0); // 14058

function celula(texto, opts = {}) {
  const {
    bg = null, bold = false, white = false, align = AlignmentType.LEFT,
    colSpan = 1, vAlign = VerticalAlign.CENTER, fontSize = 18, italic = false
  } = opts;

  return new TableCell({
    columnSpan: colSpan,
    verticalAlign: vAlign,
    borders: opts.semBorda ? bordasSem : bordas,
    width: { size: opts.width ?? 0, type: WidthType.DXA },
    shading: bg ? { fill: bg, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({
        text: texto,
        bold,
        italics: italic,
        color: white ? BRANCO : '1a2744',
        size: fontSize,
        font: 'Arial',
      })]
    })]
  });
}

function linhaHeader() {
  const labels = ['#', 'Fluxo', 'Passos para testar', 'Resultado esperado', 'OK', 'Falhou', 'Obs.'];
  return new TableRow({
    tableHeader: true,
    children: labels.map((l, i) => celula(l, {
      bg: AZUL_ESCURO, bold: true, white: true,
      align: i === 0 || i >= 4 ? AlignmentType.CENTER : AlignmentType.LEFT,
      width: COL[i], fontSize: 18,
    }))
  });
}

function linhaModulo(label) {
  return new TableRow({
    children: [celula(label, {
      bg: AZUL_MEDIO, bold: true, white: true,
      colSpan: 7, align: AlignmentType.LEFT, fontSize: 18,
    })]
  });
}

function linhaTeste(num, fluxo, passos, esperado, par) {
  const bg = par ? CINZA_CLARO : BRANCO;
  const makeCell = (txt, idx) => celula(txt, {
    bg,
    align: idx === 0 || idx >= 4 ? AlignmentType.CENTER : AlignmentType.LEFT,
    width: COL[idx],
    fontSize: 17,
  });
  return new TableRow({
    children: [
      makeCell(String(num), 0),
      makeCell(fluxo, 1),
      makeCell(passos, 2),
      makeCell(esperado, 3),
      makeCell('', 4),
      makeCell('', 5),
      makeCell('', 6),
    ]
  });
}

// ── Dados dos casos de teste ────────────────────────────────────────────────
const modulos = [
  {
    label: 'MÓDULO 1: AUTENTICAÇÃO',
    testes: [
      [1,  'Login com usuário válido',              '1. Acesse /login\n2. Informe e-mail e senha corretos\n3. Clique em Entrar',                                        'Redireciona para o Dashboard'],
      [2,  'Login com dados inválidos',              '1. Acesse /login\n2. Informe senha errada\n3. Clique em Entrar',                                                   'Exibe mensagem de erro'],
      [3,  'Logout',                                 '1. Estando logado, clique no botão de sair',                                                                       'Sessão encerrada, redireciona para /login'],
      [4,  'Acesso sem login',                       '1. Sem estar logado, tente acessar /clients',                                                                      'Redireciona para /login'],
    ]
  },
  {
    label: 'MÓDULO 2: CLIENTES',
    testes: [
      [5,  'Listar clientes',                        '1. Acesse /clients',                                                                                               'Lista de clientes exibida com paginação'],
      [6,  'Criar cliente',                           '1. Clique em Novo Cliente\n2. Preencha nome e empresa\n3. Salve',                                                  'Cliente criado e aparece na lista'],
    ]
  },
  {
    label: 'MÓDULO 3: TEMPLATES DE FORMULÁRIO',
    testes: [
      [7,  'Criar formulário simples',               '1. Acesse /form-builder\n2. Selecione um cliente\n3. Adicione campos\n4. Salve',                                   'Template criado com slug único'],
      [8,  'Reordenar campos (drag-and-drop)',        '1. No builder, arraste um campo para outra posição',                                                               'Campo reposicionado corretamente'],
      [9,  'Configurar aparência',                    '1. No builder, acesse aba Aparência\n2. Altere cor, fonte e imagens',                                              'Formulário público reflete as mudanças'],
      [10, 'Editar template existente',              '1. Acesse /form-builder/slug\n2. Altere um campo\n3. Salve',                                                       'Alteração salva e visível no formulário público'],
    ]
  },
  {
    label: 'MÓDULO 4: PREENCHIMENTO PÚBLICO',
    testes: [
      [11, 'Acessar formulário sem login',           '1. Abra /forms/slug em aba anônima',                                                                              'Formulário carrega sem pedir login'],
      [12, 'Enviar formulário simples',              '1. Preencha todos os campos obrigatórios\n2. Clique em Enviar',                                                    'Confirmação de envio exibida'],
      [13, 'Validação de campo obrigatório',         '1. Deixe um campo obrigatório em branco\n2. Tente enviar',                                                         'Mensagem de erro no campo'],
    ]
  },
  {
    label: 'MÓDULO 5: AGENDAMENTO',
    testes: [
      [14, 'Dados do solicitante antes do horário', '1. Acesse formulário com agendamento\n2. Preencha nome/contato\n3. Depois escolha a data',                         'Campos do solicitante aparecem acima do calendário'],
      [15, 'Ver slots disponíveis',                  '1. Selecione uma data futura',                                                                                     'Horários disponíveis são exibidos'],
      [16, 'Horários passados bloqueados',           '1. Selecione a data de hoje',                                                                                      'Horários que já passaram aparecem como indisponíveis'],
      [17, 'Confirmar agendamento',                  '1. Preencha os dados\n2. Selecione data e horário\n3. Confirme',                                                   'Agendamento salvo, confirmação exibida'],
      [18, 'Slot lotado',                            '1. Tente agendar em horário sem vagas',                                                                            'Botão do slot desabilitado'],
      [19, 'Cancelar agendamento (admin)',           '1. Em Ver respostas, localize o agendamento\n2. Cancele',                                                          'Status muda para Cancelado'],
      [20, 'Exportar agendamentos',                  '1. Em Ver respostas, clique em Exportar Excel',                                                                    'Arquivo .xlsx baixado com os agendamentos'],
    ]
  },
  {
    label: 'MÓDULO 6: LISTA DE PRESENÇA',
    testes: [
      [21, 'Importar planilha Excel',               '1. No template, acesse Lista de Presença\n2. Importe um arquivo .xlsx',                                            'Registros aparecem na tabela'],
      [22, 'Ordem das colunas',                      '1. Após importar, verifique a ordem das colunas',                                                                  'Colunas seguem a ordem da planilha importada'],
      [23, 'Coluna Presença no final',              '1. Visualize a tabela de presença',                                                                                'Botão Presente/Ausente é a última coluna de dados'],
      [24, 'Célula vazia editável',                  '1. Localize um registro com campo em branco',                                                                      'Campo vazio exibe input para edição'],
      [25, 'Célula preenchida somente leitura',     '1. Localize um registro com campo preenchido',                                                                     'Campo exibe texto, sem input'],
      [26, 'Marcar presença',                        '1. Clique em Ausente em um registro',                                                                              'Muda para Presente com destaque visual'],
      [27, 'Adicionar observação',                   '1. Digite no campo Obs. de um registro\n2. Clique fora do campo',                                                  'Observação salva automaticamente'],
      [28, 'Campo custom ao final',                  '1. Crie um campo no template\n2. Veja a tabela de presença',                                                      'Campo custom aparece após as colunas da planilha'],
      [29, 'Exportar lista de presença',            '1. Clique em Exportar Excel na aba Presença',                                                                     'Arquivo .xlsx baixado com presenças e observações'],
      [30, 'Reimportar planilha',                    '1. Importe uma nova planilha no mesmo template',                                                                   'Lista anterior é substituída pela nova'],
    ]
  },
  {
    label: 'MÓDULO 7: CONTROLE DE ACESSO (RBAC)',
    testes: [
      [31, 'Admin acessa tudo',                      '1. Logue como ADMIN\n2. Navegue por todas as rotas',                                                              'Acesso liberado a todos os módulos'],
      [32, 'Funcionário sem criação de template',   '1. Logue como FUNCIONARIO\n2. Tente criar/editar template',                                                        'Ação bloqueada ou botão não visível'],
      [33, 'Cliente vê apenas dashboard',            '1. Logue como CLIENT',                                                                                             'Acesso restrito ao dashboard e visualização'],
    ]
  },
  {
    label: 'MÓDULO 8: GERAL',
    testes: [
      [34, 'Alternar tema claro/escuro',             '1. Clique no botão de tema no cabeçalho',                                                                         'Interface muda entre modo claro e escuro'],
      [35, 'Exportar relatório do dashboard',        '1. No Dashboard, clique em Exportar',                                                                              'Arquivo .xlsx com resumo baixado'],
      [36, 'Paginação de listas',                    '1. Em qualquer lista com muitos registros\n2. Navegue pelas páginas',                                              'Paginação funciona corretamente'],
      [37, 'Mensagens de feedback',                  '1. Execute qualquer ação (salvar, excluir, etc.)',                                                                  'Toast de sucesso ou erro exibido'],
    ]
  },
];

// ── Monta linhas da tabela ─────────────────────────────────────────────────
let contador = 0;
const rows = [linhaHeader()];
for (const mod of modulos) {
  rows.push(linhaModulo(mod.label));
  for (const [num, fluxo, passos, esperado] of mod.testes) {
    contador++;
    rows.push(linhaTeste(num, fluxo, passos, esperado, contador % 2 === 0));
  }
}

const tabela = new Table({
  width: { size: TABLE_W, type: WidthType.DXA },
  columnWidths: COL,
  rows,
});

// ── Seção de resultado final ───────────────────────────────────────────────
function paraResultado(label, valor = '___________________________') {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({ text: label, bold: true, font: 'Arial', size: 20, color: AZUL_ESCURO }),
      new TextRun({ text: '  ' + valor, font: 'Arial', size: 20, color: '333333' }),
    ]
  });
}

const secaoResultado = [
  new Paragraph({ spacing: { before: 400, after: 200 }, children: [
    new TextRun({ text: 'Resultado Final', bold: true, font: 'Arial', size: 26, color: AZUL_ESCURO })
  ]}),
  new Paragraph({ spacing: { after: 40 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: AZUL_CLARO } }, children: [] }),
  new Paragraph({ spacing: { after: 160 }, children: [] }),
  paraResultado('Total de casos:', '37'),
  paraResultado('Aprovados:'),
  paraResultado('Reprovados:'),
  paraResultado('N/A:'),
  new Paragraph({ spacing: { after: 160 }, children: [] }),
  paraResultado('Data dos testes:'),
  paraResultado('Testado por:'),
  paraResultado('Assinatura:'),
];

// ── Documento ──────────────────────────────────────────────────────────────
const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 20 } } }
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE },
        margin: { top: 720, right: 720, bottom: 720, left: 720 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: AZUL_CLARO } },
          spacing: { after: 80 },
          children: [
            new TextRun({ text: 'App Forms Clients', bold: true, font: 'Arial', size: 20, color: AZUL_ESCURO }),
            new TextRun({ text: '   |   Checklist de Testes', font: 'Arial', size: 20, color: '555555' }),
          ]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
          spacing: { before: 80 },
          children: [
            new TextRun({ text: 'App Forms Clients — Checklist de Testes  |  Confidencial  |  Abril 2026  |  Página ', font: 'Arial', size: 16, color: '888888' }),
            new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16, color: '888888' }),
          ]
        })]
      })
    },
    children: [
      // Título
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 160, after: 60 },
        children: [new TextRun({ text: 'Checklist de Testes — App Forms Clients', bold: true, font: 'Arial', size: 36, color: AZUL_ESCURO })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [new TextRun({ text: 'Roteiro para validação dos fluxos principais  |  Abril 2026', font: 'Arial', size: 20, color: '555555' })]
      }),
      // Legenda das colunas OK/Falhou
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 100 },
        children: [new TextRun({ text: 'Preencha: OK = aprovado   |   Falhou = reprovado   |   Obs. = observação livre', font: 'Arial', size: 16, color: '777777', italics: true })]
      }),
      tabela,
      ...secaoResultado,
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('D:/Projetos/Fabiano/Front/front-cadastro-formularios/checklist-testes.docx', buf);
  console.log('Arquivo gerado com sucesso!');
});
