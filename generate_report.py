# -*- coding: utf-8 -*-
"""
Script para gerar o Relatorio de Testes - App Forms Clients
Requer: pip install reportlab
"""

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.platypus.flowables import Flowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import datetime
import os

# ─── Paleta de Cores ───────────────────────────────────────────────────────────
DARK_BLUE    = colors.HexColor('#1a2744')
MEDIUM_BLUE  = colors.HexColor('#2a3f6f')
ACCENT_BLUE  = colors.HexColor('#4d8fff')
LIGHT_BLUE   = colors.HexColor('#dce8ff')
VERY_LIGHT   = colors.HexColor('#f0f4ff')
WHITE        = colors.white
GRAY_HEADER  = colors.HexColor('#e8ecf4')
GRAY_ROW     = colors.HexColor('#f7f9fc')
TEXT_DARK    = colors.HexColor('#1a1a2e')
TEXT_GRAY    = colors.HexColor('#555577')
SUCCESS_GRN  = colors.HexColor('#1a7a4a')
BORDER_GRAY  = colors.HexColor('#c8d0e0')
ORANGE       = colors.HexColor('#e07b39')

OUTPUT_PATH = r'D:\Projetos\Fabiano\Front\front-cadastro-formularios\relatorio-testes.pdf'


# ─── Estilos ───────────────────────────────────────────────────────────────────
def build_styles():
    base = getSampleStyleSheet()

    def ps(name, **kw):
        return ParagraphStyle(name, **kw)

    return {
        'cover_title': ps('cover_title',
            fontName='Helvetica-Bold', fontSize=28, textColor=WHITE,
            alignment=TA_CENTER, spaceAfter=6, leading=34),

        'cover_subtitle': ps('cover_subtitle',
            fontName='Helvetica', fontSize=14, textColor=LIGHT_BLUE,
            alignment=TA_CENTER, spaceAfter=4, leading=20),

        'cover_info': ps('cover_info',
            fontName='Helvetica', fontSize=11, textColor=WHITE,
            alignment=TA_CENTER, spaceAfter=4, leading=16),

        'section_title': ps('section_title',
            fontName='Helvetica-Bold', fontSize=13, textColor=WHITE,
            alignment=TA_LEFT, spaceAfter=2, leading=16),

        'intro_title': ps('intro_title',
            fontName='Helvetica-Bold', fontSize=14, textColor=DARK_BLUE,
            spaceAfter=8, leading=18),

        'intro_body': ps('intro_body',
            fontName='Helvetica', fontSize=9.5, textColor=TEXT_DARK,
            spaceAfter=6, leading=14, alignment=TA_JUSTIFY),

        'module_title': ps('module_title',
            fontName='Helvetica-Bold', fontSize=11, textColor=WHITE,
            alignment=TA_LEFT, spaceAfter=0, leading=14),

        'ct_id': ps('ct_id',
            fontName='Helvetica-Bold', fontSize=8, textColor=DARK_BLUE,
            alignment=TA_CENTER, leading=11),

        'cell_bold': ps('cell_bold',
            fontName='Helvetica-Bold', fontSize=8, textColor=TEXT_DARK,
            leading=11),

        'cell_normal': ps('cell_normal',
            fontName='Helvetica', fontSize=7.5, textColor=TEXT_DARK,
            leading=11),

        'cell_steps': ps('cell_steps',
            fontName='Helvetica', fontSize=7.5, textColor=TEXT_DARK,
            leading=11),

        'status_cell': ps('status_cell',
            fontName='Helvetica', fontSize=7, textColor=TEXT_DARK,
            alignment=TA_CENTER, leading=11),

        'footer_text': ps('footer_text',
            fontName='Helvetica', fontSize=7.5, textColor=TEXT_GRAY,
            alignment=TA_CENTER, leading=10),

        'summary_header': ps('summary_header',
            fontName='Helvetica-Bold', fontSize=9, textColor=WHITE,
            alignment=TA_CENTER, leading=12),

        'summary_cell': ps('summary_cell',
            fontName='Helvetica', fontSize=9, textColor=TEXT_DARK,
            alignment=TA_CENTER, leading=12),

        'summary_title': ps('summary_title',
            fontName='Helvetica-Bold', fontSize=14, textColor=DARK_BLUE,
            spaceAfter=10, leading=18),

        'sign_label': ps('sign_label',
            fontName='Helvetica-Bold', fontSize=9, textColor=DARK_BLUE,
            alignment=TA_CENTER, leading=12),

        'sign_name': ps('sign_name',
            fontName='Helvetica', fontSize=9, textColor=TEXT_DARK,
            alignment=TA_CENTER, leading=12),

        'toc_title': ps('toc_title',
            fontName='Helvetica-Bold', fontSize=14, textColor=DARK_BLUE,
            spaceAfter=10, leading=18),

        'toc_item': ps('toc_item',
            fontName='Helvetica', fontSize=10, textColor=TEXT_DARK,
            spaceAfter=4, leading=14, leftIndent=10),
    }


# ─── Header / Footer por pagina ────────────────────────────────────────────────
def make_page_template(doc, styles):
    page_w, page_h = landscape(A4)
    margin = 1.5 * cm

    def on_page(canvas, doc):
        canvas.saveState()

        # ── top bar ──
        canvas.setFillColor(DARK_BLUE)
        canvas.rect(0, page_h - 1.5*cm, page_w, 1.5*cm, fill=1, stroke=0)

        # accent stripe
        canvas.setFillColor(ACCENT_BLUE)
        canvas.rect(0, page_h - 1.7*cm, page_w, 0.2*cm, fill=1, stroke=0)

        # title in header
        canvas.setFont('Helvetica-Bold', 10)
        canvas.setFillColor(WHITE)
        canvas.drawString(margin, page_h - 1.1*cm, 'Relatorio de Testes - App Forms Clients')

        # right side of header
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(LIGHT_BLUE)
        canvas.drawRightString(page_w - margin, page_h - 0.85*cm, 'v1.0  |  Abril 2026')
        canvas.drawRightString(page_w - margin, page_h - 1.25*cm, 'Confidencial')

        # ── bottom bar ──
        canvas.setFillColor(DARK_BLUE)
        canvas.rect(0, 0, page_w, 1.1*cm, fill=1, stroke=0)

        canvas.setFillColor(ACCENT_BLUE)
        canvas.rect(0, 1.1*cm, page_w, 0.15*cm, fill=1, stroke=0)

        # footer text
        canvas.setFont('Helvetica', 7.5)
        canvas.setFillColor(colors.HexColor('#aabbdd'))
        canvas.drawString(margin, 0.4*cm, 'App Forms Clients  |  Relatorio de Testes  |  Confidencial')
        canvas.setFillColor(WHITE)
        canvas.drawRightString(page_w - margin, 0.4*cm,
                               f'Pagina {doc.page}')

        canvas.restoreState()

    return on_page


# ─── Capa (desenho direto no canvas, chamado via onFirstPage) ─────────────────
def draw_cover_on_canvas(canvas, page_w, page_h):
    c = canvas
    w, h = page_w, page_h

    c.saveState()

    # Background
    c.setFillColor(DARK_BLUE)
    c.rect(0, 0, w, h, fill=1, stroke=0)

    # Diagonal strip bottom-right
    p = c.beginPath()
    p.moveTo(w * 0.62, 0)
    p.lineTo(w * 0.72, 0)
    p.lineTo(w, h * 0.38)
    p.lineTo(w, 0)
    p.close()
    c.setFillColor(MEDIUM_BLUE)
    c.drawPath(p, fill=1, stroke=0)

    # Diagonal strip top-right
    p2 = c.beginPath()
    p2.moveTo(w * 0.55, h)
    p2.lineTo(w, h)
    p2.lineTo(w, h * 0.55)
    p2.close()
    c.setFillColor(colors.HexColor('#223366'))
    c.drawPath(p2, fill=1, stroke=0)

    # Accent bar left
    c.setFillColor(ACCENT_BLUE)
    c.rect(0, h * 0.38, 0.6*cm, h * 0.24, fill=1, stroke=0)

    # Top accent line
    c.setFillColor(ACCENT_BLUE)
    c.rect(0, h - 0.35*cm, w, 0.35*cm, fill=1, stroke=0)

    # Bottom bar
    c.setFillColor(colors.HexColor('#0d1633'))
    c.rect(0, 0, w, 1.8*cm, fill=1, stroke=0)
    c.setFillColor(ACCENT_BLUE)
    c.rect(0, 1.8*cm, w, 0.2*cm, fill=1, stroke=0)

    # Logo placeholder
    c.setFillColor(ACCENT_BLUE)
    c.roundRect(2.5*cm, h - 4.5*cm, 3.5*cm, 1.5*cm, 8, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont('Helvetica-Bold', 11)
    c.drawCentredString(4.25*cm, h - 3.7*cm, 'APP FORMS')

    # Main title
    c.setFillColor(WHITE)
    c.setFont('Helvetica-Bold', 32)
    c.drawString(2.5*cm, h * 0.58, 'RELATORIO DE TESTES')

    c.setFillColor(ACCENT_BLUE)
    c.setFont('Helvetica-Bold', 16)
    c.drawString(2.5*cm, h * 0.51, 'App Forms Clients  -  Plataforma de Formularios')

    # Horizontal rule
    c.setStrokeColor(ACCENT_BLUE)
    c.setLineWidth(2)
    c.line(2.5*cm, h * 0.485, w * 0.58, h * 0.485)

    # Info block
    info_y = h * 0.43
    for lbl, val in [
        ('Versao:',    'v1.0'),
        ('Data:',      'Abril 2026'),
        ('Tipo:',      'Testes Funcionais / Aceitacao'),
        ('Total CTs:', '37 Casos de Teste'),
    ]:
        c.setFont('Helvetica-Bold', 9)
        c.setFillColor(ACCENT_BLUE)
        c.drawString(2.5*cm, info_y, lbl)
        c.setFont('Helvetica', 9)
        c.setFillColor(WHITE)
        c.drawString(5.5*cm, info_y, val)
        info_y -= 1.1*cm

    # Bottom footer
    c.setFont('Helvetica', 8)
    c.setFillColor(colors.HexColor('#aabbdd'))
    c.drawString(2.5*cm, 0.9*cm, 'Documento Confidencial  |  Uso Interno')
    c.drawRightString(w - 2.5*cm, 0.9*cm, 'Gerado em: ' + datetime.date.today().strftime('%d/%m/%Y'))

    # Decorative circles
    for cx, cy, r, alpha in [
        (w * 0.88, h * 0.75, 60, 0.08),
        (w * 0.82, h * 0.68, 90, 0.05),
        (w * 0.93, h * 0.85, 40, 0.1),
    ]:
        c.setFillColor(colors.HexColor('#4d8fff'))
        c.setFillAlpha(alpha)
        c.circle(cx, cy, r, fill=1, stroke=0)
    c.setFillAlpha(1)

    c.restoreState()


def build_cover(styles):
    # A capa é desenhada diretamente via onFirstPage; aqui só avançamos de página.
    return [PageBreak()]


# ─── Introducao ───────────────────────────────────────────────────────────────
def build_intro(styles):
    story = []

    def section_bar(text):
        data = [[Paragraph(text, styles['section_title'])]]
        t = Table(data, colWidths=['100%'])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), DARK_BLUE),
            ('TOPPADDING',    (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING',   (0,0), (-1,-1), 12),
        ]))
        return t

    story.append(section_bar('1.  INTRODUCAO'))
    story.append(Spacer(1, 0.4*cm))

    story.append(Paragraph('Sobre a Plataforma', styles['intro_title']))
    story.append(Paragraph(
        'O <b>App Forms Clients</b> e uma plataforma web desenvolvida em Angular (frontend) e '
        'Spring Boot (backend), voltada ao gerenciamento completo de formularios, clientes, '
        'agendamentos e listas de presenca. A plataforma oferece controle de acesso baseado em '
        'perfis (RBAC), exportacao de dados para Excel e preenchimento publico de formularios '
        'sem necessidade de autenticacao.',
        styles['intro_body']))

    story.append(Paragraph('Objetivo do Documento', styles['intro_title']))
    story.append(Paragraph(
        'Este documento apresenta os <b>Casos de Teste</b> elaborados para validacao funcional '
        'da plataforma App Forms Clients. Cada caso de teste descreve pre-condicoes, passos de '
        'execucao, resultado esperado e uma coluna de <b>Status</b> a ser preenchida pelo testador '
        '(PASSOU / FALHOU / N/A) durante a execucao dos testes de aceitacao.',
        styles['intro_body']))

    story.append(Paragraph('Escopo', styles['intro_title']))
    bullets = [
        'Autenticacao e controle de sessao',
        'Dashboard com KPIs e filtros',
        'Gerenciamento de Clientes (CRUD)',
        'Criacao e edicao de Templates de Formulario',
        'Preenchimento publico de formulario via slug',
        'Sistema de Agendamento (slots, reservas, cancelamentos)',
        'Lista de Presenca (importacao, marcacao, exportacao)',
        'Controle de Acesso por Perfil (RBAC)',
        'Exportacao de dados para Excel',
        'Usabilidade Geral',
    ]
    for b in bullets:
        story.append(Paragraph(f'&#9679;  {b}', styles['intro_body']))

    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph('Perfis de Acesso', styles['intro_title']))

    roles_data = [
        [Paragraph('<b>Perfil</b>', styles['cell_bold']),
         Paragraph('<b>Permissoes</b>', styles['cell_bold'])],
        [Paragraph('ROLE_ADMIN', styles['cell_bold']),
         Paragraph('Acesso completo a todas as funcionalidades e modulos do sistema.', styles['cell_normal'])],
        [Paragraph('ROLE_FUNCIONARIO', styles['cell_normal']),
         Paragraph('Acesso a clientes, formularios, agendamento e lista de presenca. Sem acesso a criacao de templates.', styles['cell_normal'])],
        [Paragraph('ROLE_CLIENT', styles['cell_normal']),
         Paragraph('Acesso apenas ao dashboard e visualizacao de formularios.', styles['cell_normal'])],
    ]

    page_w = landscape(A4)[0]
    margin = 3*cm
    usable = page_w - margin

    roles_t = Table(roles_data, colWidths=[usable*0.22, usable*0.78])
    roles_t.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,0), DARK_BLUE),
        ('TEXTCOLOR',     (0,0), (-1,0), WHITE),
        ('BACKGROUND',    (0,1), (-1,1), LIGHT_BLUE),
        ('BACKGROUND',    (0,2), (-1,2), GRAY_ROW),
        ('BACKGROUND',    (0,3), (-1,3), LIGHT_BLUE),
        ('GRID',          (0,0), (-1,-1), 0.5, BORDER_GRAY),
        ('TOPPADDING',    (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING',   (0,0), (-1,-1), 8),
        ('RIGHTPADDING',  (0,0), (-1,-1), 8),
        ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(roles_t)

    story.append(Spacer(1, 0.4*cm))
    story.append(Paragraph('Convencao de Status', styles['intro_title']))
    status_data = [
        [Paragraph('<b>Status</b>', styles['cell_bold']),
         Paragraph('<b>Descricao</b>', styles['cell_bold'])],
        [Paragraph('PASSOU', styles['cell_bold']),
         Paragraph('O caso de teste foi executado e o resultado obtido esta de acordo com o resultado esperado.', styles['cell_normal'])],
        [Paragraph('FALHOU', styles['cell_bold']),
         Paragraph('O caso de teste foi executado e o resultado obtido difere do resultado esperado.', styles['cell_normal'])],
        [Paragraph('N/A', styles['cell_bold']),
         Paragraph('O caso de teste nao se aplica ao ambiente ou configuracao testada.', styles['cell_normal'])],
    ]
    status_t = Table(status_data, colWidths=[usable*0.15, usable*0.85])
    status_t.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,0), DARK_BLUE),
        ('TEXTCOLOR',     (0,0), (-1,0), WHITE),
        ('BACKGROUND',    (0,1), (-1,1), colors.HexColor('#e8f5ee')),
        ('BACKGROUND',    (0,2), (-1,2), colors.HexColor('#fdecea')),
        ('BACKGROUND',    (0,3), (-1,3), GRAY_ROW),
        ('GRID',          (0,0), (-1,-1), 0.5, BORDER_GRAY),
        ('TOPPADDING',    (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING',   (0,0), (-1,-1), 8),
        ('RIGHTPADDING',  (0,0), (-1,-1), 8),
        ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(status_t)
    story.append(PageBreak())
    return story


# ─── Dados dos Casos de Teste ─────────────────────────────────────────────────
TEST_CASES = {
    'Modulo 1 - Autenticacao': [
        {
            'id': 'CT-001',
            'name': 'Login com credenciais validas',
            'pre': 'Usuario cadastrado no sistema.\nSistema acessivel em /login.',
            'steps': '1. Acessar a rota /login.\n2. Informar email e senha validos.\n3. Clicar em "Entrar".',
            'expected': 'Usuario autenticado com sucesso e redirecionado ao dashboard (/).',
        },
        {
            'id': 'CT-002',
            'name': 'Login com credenciais invalidas',
            'pre': 'Sistema acessivel em /login.',
            'steps': '1. Acessar /login.\n2. Informar email valido e senha incorreta.\n3. Clicar em "Entrar".',
            'expected': 'Mensagem de erro exibida. Nenhum redirecionamento realizado.',
        },
        {
            'id': 'CT-003',
            'name': 'Logout do sistema',
            'pre': 'Usuario autenticado no sistema.',
            'steps': '1. Clicar na opcao de logout no menu.\n2. Confirmar a acao se solicitado.',
            'expected': 'Sessao encerrada. Usuario redirecionado para /login.',
        },
        {
            'id': 'CT-004',
            'name': 'Acesso a rota protegida sem login',
            'pre': 'Nenhuma sessao ativa no navegador.',
            'steps': '1. Acessar diretamente a URL /clients.\n2. Observar o comportamento.',
            'expected': 'Sistema redireciona automaticamente para /login.',
        },
        {
            'id': 'CT-005',
            'name': 'Cadastro de novo usuario',
            'pre': 'Sistema acessivel em /register.',
            'steps': '1. Acessar /register.\n2. Preencher nome, email e senha.\n3. Submeter o formulario.',
            'expected': 'Usuario criado com sucesso. Redirecionado para /login ou dashboard.',
        },
    ],
    'Modulo 2 - Dashboard': [
        {
            'id': 'CT-006',
            'name': 'Visualizacao de KPIs',
            'pre': 'Usuario autenticado. Dados existentes no sistema.',
            'steps': '1. Acessar a rota /.\n2. Observar os cards de KPI exibidos.',
            'expected': 'KPIs renderizados corretamente com valores atualizados.',
        },
        {
            'id': 'CT-007',
            'name': 'Filtro de dados por periodo',
            'pre': 'Usuario autenticado. Dashboard carregado.',
            'steps': '1. Localizar filtro de periodo no dashboard.\n2. Selecionar data inicio e data fim.\n3. Aplicar o filtro.',
            'expected': 'KPIs e graficos atualizados conforme o periodo selecionado.',
        },
    ],
    'Modulo 3 - Gerenciamento de Clientes': [
        {
            'id': 'CT-008',
            'name': 'Listagem de clientes',
            'pre': 'Usuario com perfil ROLE_ADMIN ou ROLE_FUNCIONARIO autenticado.',
            'steps': '1. Acessar /clients.\n2. Aguardar carregamento da lista.',
            'expected': 'Lista de clientes exibida com nome, email e acoes disponiveis.',
        },
        {
            'id': 'CT-009',
            'name': 'Criacao de novo cliente',
            'pre': 'Usuario autenticado com permissao de criacao.',
            'steps': '1. Acessar /clients/new.\n2. Preencher campos obrigatorios.\n3. Salvar o cadastro.',
            'expected': 'Cliente criado e listado em /clients.',
        },
        {
            'id': 'CT-010',
            'name': 'Edicao de cliente existente',
            'pre': 'Cliente ja cadastrado no sistema.',
            'steps': '1. Acessar /clients.\n2. Clicar em editar em um cliente.\n3. Alterar dados e salvar.',
            'expected': 'Dados do cliente atualizados corretamente.',
        },
        {
            'id': 'CT-011',
            'name': 'Busca/filtro de clientes',
            'pre': 'Pelo menos 3 clientes cadastrados.',
            'steps': '1. Acessar /clients.\n2. Utilizar campo de busca.\n3. Digitar parte do nome/email.',
            'expected': 'Lista filtrada exibindo apenas clientes correspondentes.',
        },
    ],
    'Modulo 4 - Criacao de Templates de Formulario': [
        {
            'id': 'CT-012',
            'name': 'Criacao de formulario simples',
            'pre': 'Usuario ROLE_ADMIN autenticado.',
            'steps': '1. Acessar /form-builder.\n2. Adicionar titulo.\n3. Inserir campos dinamicos.\n4. Salvar o template.',
            'expected': 'Template criado com slug unico gerado automaticamente.',
        },
        {
            'id': 'CT-013',
            'name': 'Drag-and-drop de campos',
            'pre': 'Template em edicao no form-builder.',
            'steps': '1. Adicionar pelo menos 3 campos.\n2. Arrastar um campo para outra posicao.\n3. Verificar nova ordem.',
            'expected': 'Campos reordenados conforme acao de arrastar e soltar.',
        },
        {
            'id': 'CT-014',
            'name': 'Configuracao de aparencia',
            'pre': 'Template em edicao no form-builder.',
            'steps': '1. Acessar aba de aparencia.\n2. Alterar cor primaria, fonte e imagem de fundo.\n3. Salvar.',
            'expected': 'Formulario publico reflete as configuracoes de aparencia salvas.',
        },
        {
            'id': 'CT-015',
            'name': 'Criacao de formulario com agendamento',
            'pre': 'Usuario ROLE_ADMIN autenticado.',
            'steps': '1. Criar novo template.\n2. Ativar opcao de agendamento.\n3. Salvar.',
            'expected': 'Formulario criado com modulo de agendamento habilitado.',
        },
        {
            'id': 'CT-016',
            'name': 'Configuracao de slots de horario',
            'pre': 'Template com agendamento ativo.',
            'steps': '1. Acessar configuracao de slots.\n2. Definir hora inicio, hora fim, duracao e capacidade.\n3. Salvar.',
            'expected': 'Slots gerados automaticamente conforme parametros configurados.',
        },
        {
            'id': 'CT-017',
            'name': 'Edicao de template existente',
            'pre': 'Template ja criado. ROLE_ADMIN autenticado.',
            'steps': '1. Acessar /form-builder/:slug.\n2. Alterar titulo ou campos.\n3. Salvar alteracoes.',
            'expected': 'Template atualizado sem alteracao do slug original.',
        },
        {
            'id': 'CT-018',
            'name': 'Verificacao do slug unico',
            'pre': 'Template criado com titulo definido.',
            'steps': '1. Criar dois templates com o mesmo titulo.\n2. Verificar slugs gerados.',
            'expected': 'Slugs distintos gerados para cada template.',
        },
    ],
    'Modulo 5 - Preenchimento Publico de Formulario': [
        {
            'id': 'CT-019',
            'name': 'Acesso publico via URL',
            'pre': 'Template publicado. Nenhum usuario autenticado.',
            'steps': '1. Acessar /forms/:slug sem estar autenticado.\n2. Observar carregamento.',
            'expected': 'Formulario exibido normalmente sem solicitar login.',
        },
        {
            'id': 'CT-020',
            'name': 'Preenchimento e envio de formulario',
            'pre': 'Formulario publico acessivel.',
            'steps': '1. Preencher todos os campos.\n2. Clicar em "Enviar".',
            'expected': 'Resposta registrada com sucesso. Mensagem de confirmacao exibida.',
        },
        {
            'id': 'CT-021',
            'name': 'Validacao de campos obrigatorios',
            'pre': 'Formulario publico com campos obrigatorios.',
            'steps': '1. Deixar campos obrigatorios em branco.\n2. Tentar enviar.',
            'expected': 'Envio bloqueado. Mensagens de validacao exibidas nos campos.',
        },
        {
            'id': 'CT-022',
            'name': 'Confirmacao de envio bem-sucedido',
            'pre': 'Formulario publico acessivel.',
            'steps': '1. Preencher formulario corretamente.\n2. Enviar.\n3. Observar feedback.',
            'expected': 'Pagina ou mensagem de sucesso exibida apos envio.',
        },
    ],
    'Modulo 6 - Agendamento': [
        {
            'id': 'CT-023',
            'name': 'Visualizacao de slots disponiveis',
            'pre': 'Formulario com agendamento. Slots configurados.',
            'steps': '1. Acessar formulario publico.\n2. Selecionar uma data disponivel.',
            'expected': 'Lista de horarios disponiveis exibida para a data selecionada.',
        },
        {
            'id': 'CT-024',
            'name': 'Bloqueio de horarios passados',
            'pre': 'Formulario com agendamento ativo. Data atual selecionada.',
            'steps': '1. Selecionar a data de hoje.\n2. Observar horarios anteriores a hora atual.',
            'expected': 'Horarios ja passados aparecem desabilitados ou ocultos.',
        },
        {
            'id': 'CT-025',
            'name': 'Dados do solicitante antes do horario',
            'pre': 'Formulario com agendamento exibido.',
            'steps': '1. Tentar selecionar horario sem preencher dados.\n2. Preencher dados do solicitante.\n3. Selecionar horario.',
            'expected': 'Sistema exige dados antes da selecao do horario.',
        },
        {
            'id': 'CT-026',
            'name': 'Selecao e confirmacao de agendamento',
            'pre': 'Dados do solicitante preenchidos. Slot disponivel.',
            'steps': '1. Selecionar horario disponivel.\n2. Confirmar agendamento.',
            'expected': 'Agendamento registrado. Confirmacao exibida ao usuario.',
        },
        {
            'id': 'CT-027',
            'name': 'Tentativa em horario lotado',
            'pre': 'Slot com capacidade maxima atingida.',
            'steps': '1. Tentar selecionar horario lotado.\n2. Confirmar acao.',
            'expected': 'Sistema bloqueia a reserva. Mensagem de lotacao exibida.',
        },
        {
            'id': 'CT-028',
            'name': 'Cancelamento de agendamento (admin)',
            'pre': 'Agendamento existente. ROLE_ADMIN autenticado.',
            'steps': '1. Acessar area administrativa de agendamentos.\n2. Localizar agendamento.\n3. Cancelar.',
            'expected': 'Agendamento cancelado. Slot liberado para novos agendamentos.',
        },
        {
            'id': 'CT-029',
            'name': 'Visualizacao administrativa de agendamentos',
            'pre': 'ROLE_ADMIN ou ROLE_FUNCIONARIO autenticado.',
            'steps': '1. Acessar painel de agendamentos.\n2. Verificar lista de reservas.',
            'expected': 'Lista de agendamentos exibida com dados do solicitante, data e horario.',
        },
        {
            'id': 'CT-030',
            'name': 'Exportacao de agendamentos para Excel',
            'pre': 'Agendamentos existentes. Usuario autenticado.',
            'steps': '1. Acessar painel de agendamentos.\n2. Clicar em exportar Excel.',
            'expected': 'Arquivo .xlsx gerado com todos os agendamentos listados.',
        },
    ],
    'Modulo 7 - Lista de Presenca': [
        {
            'id': 'CT-031',
            'name': 'Importacao de planilha Excel',
            'pre': 'Planilha .xlsx valida disponivel. Usuario autenticado.',
            'steps': '1. Acessar modulo de lista de presenca.\n2. Selecionar arquivo .xlsx.\n3. Confirmar importacao.',
            'expected': 'Planilha importada. Dados exibidos na tabela.',
        },
        {
            'id': 'CT-032',
            'name': 'Ordem das colunas conforme planilha',
            'pre': 'Planilha importada com colunas definidas.',
            'steps': '1. Verificar colunas na tabela apos importacao.\n2. Comparar com planilha original.',
            'expected': 'Colunas exibidas na mesma ordem da planilha importada.',
        },
        {
            'id': 'CT-033',
            'name': 'Colunas preenchidas sao somente leitura',
            'pre': 'Planilha importada com celulas preenchidas.',
            'steps': '1. Tentar editar celula com valor proveniente da planilha.\n2. Observar comportamento.',
            'expected': 'Celulas com valor importado nao sao editaveis.',
        },
        {
            'id': 'CT-034',
            'name': 'Celulas vazias ficam editaveis',
            'pre': 'Planilha importada com celulas em branco.',
            'steps': '1. Clicar em celula vazia.\n2. Digitar um valor.',
            'expected': 'Celula aceita edicao e valor e salvo.',
        },
        {
            'id': 'CT-035',
            'name': 'Marcar participante como Presente',
            'pre': 'Lista de presenca carregada.',
            'steps': '1. Localizar participante na lista.\n2. Marcar como "Presente".',
            'expected': 'Status atualizado para Presente. Indicador visual alterado.',
        },
        {
            'id': 'CT-036',
            'name': 'Marcar participante como Ausente',
            'pre': 'Lista de presenca carregada.',
            'steps': '1. Localizar participante na lista.\n2. Marcar como "Ausente".',
            'expected': 'Status atualizado para Ausente. Indicador visual alterado.',
        },
        {
            'id': 'CT-037',
            'name': 'Adicao de observacao em registro',
            'pre': 'Lista de presenca carregada.',
            'steps': '1. Localizar participante.\n2. Clicar no campo de observacao.\n3. Digitar texto e salvar.',
            'expected': 'Observacao salva e exibida no registro do participante.',
        },
        {
            'id': 'CT-038',
            'name': 'Campo custom ao final das colunas',
            'pre': 'Planilha importada. Campo customizado adicionado.',
            'steps': '1. Adicionar campo personalizado.\n2. Verificar posicao na tabela.',
            'expected': 'Campo custom aparece apos as colunas da planilha importada.',
        },
        {
            'id': 'CT-039',
            'name': 'Coluna Presenca sempre ao final',
            'pre': 'Lista de presenca carregada.',
            'steps': '1. Observar disposicao das colunas na tabela.\n2. Verificar posicao de "Presenca".',
            'expected': 'Coluna "Presenca" sempre aparece como ultima coluna da tabela.',
        },
        {
            'id': 'CT-040',
            'name': 'Exportacao da lista de presenca',
            'pre': 'Lista com dados preenchidos. Usuario autenticado.',
            'steps': '1. Clicar em "Exportar Excel".\n2. Verificar arquivo gerado.',
            'expected': 'Arquivo .xlsx gerado com todos os dados e colunas de presenca.',
        },
        {
            'id': 'CT-041',
            'name': 'Reimportacao substitui registros anteriores',
            'pre': 'Lista existente com dados. Nova planilha disponivel.',
            'steps': '1. Importar nova planilha sobre lista existente.\n2. Verificar dados.',
            'expected': 'Registros anteriores substituidos pelos dados da nova planilha.',
        },
        {
            'id': 'CT-042',
            'name': 'Busca/filtro na lista de presenca',
            'pre': 'Lista com varios participantes carregada.',
            'steps': '1. Utilizar campo de busca.\n2. Digitar nome ou informacao do participante.',
            'expected': 'Lista filtrada exibindo apenas participantes correspondentes.',
        },
    ],
    'Modulo 8 - Controle de Acesso (RBAC)': [
        {
            'id': 'CT-043',
            'name': 'ROLE_ADMIN acessa tudo',
            'pre': 'Usuario com ROLE_ADMIN autenticado.',
            'steps': '1. Acessar todos os modulos do sistema.\n2. Verificar disponibilidade de funcionalidades.',
            'expected': 'Todas as funcionalidades e rotas acessiveis sem restricao.',
        },
        {
            'id': 'CT-044',
            'name': 'ROLE_FUNCIONARIO sem criacao de templates',
            'pre': 'Usuario com ROLE_FUNCIONARIO autenticado.',
            'steps': '1. Tentar acessar /form-builder.\n2. Tentar criar novo template.',
            'expected': 'Acesso negado ou opcao oculta para criacao de templates.',
        },
        {
            'id': 'CT-045',
            'name': 'ROLE_CLIENT acessa apenas dashboard e forms',
            'pre': 'Usuario com ROLE_CLIENT autenticado.',
            'steps': '1. Tentar acessar /clients.\n2. Tentar acessar /users.\n3. Acessar / e /forms.',
            'expected': 'Acesso negado em /clients e /users. Dashboard e forms acessiveis.',
        },
        {
            'id': 'CT-046',
            'name': 'Bloqueio em rota sem perfil adequado',
            'pre': 'Usuario autenticado sem permissao para rota.',
            'steps': '1. Digitar diretamente URL restrita.\n2. Verificar resposta do sistema.',
            'expected': 'Sistema redireciona para pagina de acesso negado ou dashboard.',
        },
    ],
    'Modulo 9 - Exportacao de Dados': [
        {
            'id': 'CT-047',
            'name': 'Exportacao de respostas para Excel',
            'pre': 'Respostas de formulario existentes. Usuario autenticado.',
            'steps': '1. Acessar lista de respostas.\n2. Clicar em exportar Excel.',
            'expected': 'Arquivo .xlsx gerado com todas as respostas do formulario.',
        },
        {
            'id': 'CT-048',
            'name': 'Exportacao de relatorio do dashboard',
            'pre': 'Dashboard com dados. Usuario autenticado.',
            'steps': '1. Acessar /.\n2. Localizar opcao de exportacao.\n3. Exportar.',
            'expected': 'Relatorio exportado em formato Excel com dados do dashboard.',
        },
    ],
    'Modulo 10 - Usabilidade Geral': [
        {
            'id': 'CT-049',
            'name': 'Alternancia de tema claro/escuro',
            'pre': 'Usuario autenticado. Toggle de tema disponivel.',
            'steps': '1. Clicar no toggle de tema.\n2. Verificar mudanca visual.\n3. Recarregar pagina.',
            'expected': 'Tema alternado e mantido apos recarregamento da pagina.',
        },
        {
            'id': 'CT-050',
            'name': 'Navegacao entre paginas sem erros',
            'pre': 'Usuario autenticado no sistema.',
            'steps': '1. Navegar por todas as rotas principais.\n2. Verificar console do navegador.',
            'expected': 'Todas as rotas funcionam sem erros de rota ou tela branca.',
        },
        {
            'id': 'CT-051',
            'name': 'Mensagens de erro amigaveis',
            'pre': 'Sistema com tratamento de erros configurado.',
            'steps': '1. Provocar erro (campo invalido, requisicao falha).\n2. Observar feedback.',
            'expected': 'Mensagem de erro clara e em portugues exibida ao usuario.',
        },
        {
            'id': 'CT-052',
            'name': 'Paginacao de listas longas',
            'pre': 'Lista com mais de 10 registros.',
            'steps': '1. Acessar lista com muitos registros.\n2. Navegar entre paginas.',
            'expected': 'Paginacao funcional, carregando registros corretamente por pagina.',
        },
    ],
}

MODULE_COLORS = {
    'Modulo 1 - Autenticacao':                   colors.HexColor('#1a2744'),
    'Modulo 2 - Dashboard':                      colors.HexColor('#1b3a6b'),
    'Modulo 3 - Gerenciamento de Clientes':      colors.HexColor('#1e4080'),
    'Modulo 4 - Criacao de Templates de Formulario': colors.HexColor('#204799'),
    'Modulo 5 - Preenchimento Publico de Formulario': colors.HexColor('#1e5299'),
    'Modulo 6 - Agendamento':                    colors.HexColor('#1a5c99'),
    'Modulo 7 - Lista de Presenca':              colors.HexColor('#166699'),
    'Modulo 8 - Controle de Acesso (RBAC)':      colors.HexColor('#127099'),
    'Modulo 9 - Exportacao de Dados':            colors.HexColor('#0d7a99'),
    'Modulo 10 - Usabilidade Geral':             colors.HexColor('#0a8499'),
}


# ─── Tabela de Casos de Teste ──────────────────────────────────────────────────
def build_test_cases(styles):
    story = []
    page_w = landscape(A4)[0]
    left_margin  = 1.5 * cm
    right_margin = 1.5 * cm
    usable = page_w - left_margin - right_margin

    # Column widths
    col_id       = usable * 0.065
    col_name     = usable * 0.145
    col_pre      = usable * 0.165
    col_steps    = usable * 0.255
    col_expected = usable * 0.205
    col_status   = usable * 0.165

    module_num = 2  # starting section number

    for module_name, cases in TEST_CASES.items():
        mod_color = MODULE_COLORS.get(module_name, DARK_BLUE)

        # Module header bar
        header_data = [[Paragraph(f'{module_num - 1}.  {module_name.upper()}', styles['module_title'])]]
        header_t = Table(header_data, colWidths=[usable])
        header_t.setStyle(TableStyle([
            ('BACKGROUND',    (0,0), (-1,-1), mod_color),
            ('TOPPADDING',    (0,0), (-1,-1), 9),
            ('BOTTOMPADDING', (0,0), (-1,-1), 9),
            ('LEFTPADDING',   (0,0), (-1,-1), 14),
            ('RIGHTPADDING',  (0,0), (-1,-1), 14),
        ]))
        story.append(KeepTogether([header_t]))
        story.append(Spacer(1, 0.2*cm))

        # Column header row
        col_header_row = [
            Paragraph('<b>ID</b>', styles['summary_header']),
            Paragraph('<b>Nome do Teste</b>', styles['summary_header']),
            Paragraph('<b>Pre-condicoes</b>', styles['summary_header']),
            Paragraph('<b>Passos de Execucao</b>', styles['summary_header']),
            Paragraph('<b>Resultado Esperado</b>', styles['summary_header']),
            Paragraph('<b>Status</b>', styles['summary_header']),
        ]

        table_data = [col_header_row]
        col_widths = [col_id, col_name, col_pre, col_steps, col_expected, col_status]

        for i, tc in enumerate(cases):
            status_content = Paragraph(
                '[ ]  PASSOU\n\n[ ]  FALHOU\n\n[ ]  N/A',
                styles['status_cell']
            )

            row = [
                Paragraph(tc['id'], styles['ct_id']),
                Paragraph(tc['name'], styles['cell_bold']),
                Paragraph(tc['pre'].replace('\n', '<br/>'), styles['cell_normal']),
                Paragraph(tc['steps'].replace('\n', '<br/>'), styles['cell_steps']),
                Paragraph(tc['expected'], styles['cell_normal']),
                status_content,
            ]
            table_data.append(row)

        tbl = Table(table_data, colWidths=col_widths, repeatRows=1)

        # Build style commands
        style_cmds = [
            # Header
            ('BACKGROUND',    (0,0), (-1,0), mod_color),
            ('TEXTCOLOR',     (0,0), (-1,0), WHITE),
            ('TOPPADDING',    (0,0), (-1,0), 7),
            ('BOTTOMPADDING', (0,0), (-1,0), 7),
            ('LEFTPADDING',   (0,0), (-1,-1), 5),
            ('RIGHTPADDING',  (0,0), (-1,-1), 5),
            ('TOPPADDING',    (0,1), (-1,-1), 5),
            ('BOTTOMPADDING', (0,1), (-1,-1), 5),
            ('VALIGN',        (0,0), (-1,-1), 'TOP'),
            ('VALIGN',        (5,1), (5,-1), 'MIDDLE'),
            # Grid
            ('GRID',          (0,0), (-1,-1), 0.5, BORDER_GRAY),
            ('LINEBELOW',     (0,0), (-1,0), 1.5, mod_color),
            # ID column centered
            ('ALIGN',         (0,0), (0,-1), 'CENTER'),
            # Status column
            ('ALIGN',         (5,0), (5,-1), 'CENTER'),
            ('BACKGROUND',    (5,1), (5,-1), colors.HexColor('#f8f9fc')),
        ]

        # Alternating rows
        for row_idx in range(1, len(table_data)):
            if row_idx % 2 == 0:
                style_cmds.append(('BACKGROUND', (0,row_idx), (4,row_idx), GRAY_ROW))
            else:
                style_cmds.append(('BACKGROUND', (0,row_idx), (4,row_idx), WHITE))

        tbl.setStyle(TableStyle(style_cmds))
        story.append(tbl)
        story.append(Spacer(1, 0.5*cm))
        module_num += 1

    story.append(PageBreak())
    return story


# ─── Tabela Resumo ─────────────────────────────────────────────────────────────
def build_summary(styles):
    story = []
    page_w = landscape(A4)[0]
    margin = 3 * cm
    usable = page_w - margin

    def section_bar(text):
        data = [[Paragraph(text, styles['section_title'])]]
        t = Table(data, colWidths=[usable])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), DARK_BLUE),
            ('TOPPADDING',    (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING',   (0,0), (-1,-1), 12),
        ]))
        return t

    story.append(section_bar('RESUMO DOS CASOS DE TESTE'))
    story.append(Spacer(1, 0.4*cm))

    header = [
        Paragraph('<b>Modulo</b>', styles['summary_header']),
        Paragraph('<b>Total de CTs</b>', styles['summary_header']),
        Paragraph('<b>PASSOU</b>', styles['summary_header']),
        Paragraph('<b>FALHOU</b>', styles['summary_header']),
        Paragraph('<b>N/A</b>', styles['summary_header']),
        Paragraph('<b>Observacoes</b>', styles['summary_header']),
    ]

    sum_data = [header]
    total = 0
    for mod_name, cases in TEST_CASES.items():
        cnt = len(cases)
        total += cnt
        sum_data.append([
            Paragraph(mod_name, styles['summary_cell']),
            Paragraph(str(cnt), styles['summary_cell']),
            Paragraph('', styles['summary_cell']),
            Paragraph('', styles['summary_cell']),
            Paragraph('', styles['summary_cell']),
            Paragraph('', styles['summary_cell']),
        ])

    # Total row
    sum_data.append([
        Paragraph('<b>TOTAL</b>', styles['summary_header']),
        Paragraph(f'<b>{total}</b>', styles['summary_header']),
        Paragraph('', styles['summary_header']),
        Paragraph('', styles['summary_header']),
        Paragraph('', styles['summary_header']),
        Paragraph('', styles['summary_header']),
    ])

    col_w = [usable*0.38, usable*0.1, usable*0.1, usable*0.1, usable*0.08, usable*0.24]
    tbl = Table(sum_data, colWidths=col_w, repeatRows=1)

    style_cmds = [
        ('BACKGROUND',    (0,0), (-1,0), DARK_BLUE),
        ('TEXTCOLOR',     (0,0), (-1,0), WHITE),
        ('BACKGROUND',    (0,-1), (-1,-1), MEDIUM_BLUE),
        ('TEXTCOLOR',     (0,-1), (-1,-1), WHITE),
        ('GRID',          (0,0), (-1,-1), 0.5, BORDER_GRAY),
        ('TOPPADDING',    (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING',   (0,0), (-1,-1), 8),
        ('RIGHTPADDING',  (0,0), (-1,-1), 8),
        ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN',         (1,0), (-1,-1), 'CENTER'),
    ]
    for i in range(1, len(sum_data) - 1):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0,i), (-1,i), GRAY_ROW))
        else:
            style_cmds.append(('BACKGROUND', (0,i), (-1,i), WHITE))

    tbl.setStyle(TableStyle(style_cmds))
    story.append(tbl)
    story.append(Spacer(1, 0.8*cm))

    # Legend
    legend_data = [
        [Paragraph('<b>Legenda de Rotas Principais</b>', styles['cell_bold']), ''],
        [Paragraph('/login, /register', styles['cell_normal']),
         Paragraph('Publicas - sem autenticacao', styles['cell_normal'])],
        [Paragraph('/forms/:slug, /forms/:slug/list', styles['cell_normal']),
         Paragraph('Publicas - preenchimento e lista de presenca', styles['cell_normal'])],
        [Paragraph('/ (dashboard)', styles['cell_normal']),
         Paragraph('ROLE_ADMIN, ROLE_FUNCIONARIO, ROLE_CLIENT', styles['cell_normal'])],
        [Paragraph('/clients, /clients/new', styles['cell_normal']),
         Paragraph('ROLE_ADMIN, ROLE_FUNCIONARIO', styles['cell_normal'])],
        [Paragraph('/form-builder, /form-builder/:slug', styles['cell_normal']),
         Paragraph('ROLE_ADMIN', styles['cell_normal'])],
        [Paragraph('/forms, /forms-all', styles['cell_normal']),
         Paragraph('ROLE_ADMIN, ROLE_FUNCIONARIO', styles['cell_normal'])],
        [Paragraph('/users', styles['cell_normal']),
         Paragraph('ROLE_ADMIN', styles['cell_normal'])],
    ]
    leg_t = Table(legend_data, colWidths=[usable*0.38, usable*0.62])
    leg_t.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,0), LIGHT_BLUE),
        ('SPAN',          (0,0), (-1,0)),
        ('GRID',          (0,0), (-1,-1), 0.5, BORDER_GRAY),
        ('TOPPADDING',    (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING',   (0,0), (-1,-1), 8),
        ('RIGHTPADDING',  (0,0), (-1,-1), 8),
        ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
        ('BACKGROUND',    (0,1), (-1,1), GRAY_ROW),
        ('BACKGROUND',    (0,3), (-1,3), GRAY_ROW),
        ('BACKGROUND',    (0,5), (-1,5), GRAY_ROW),
        ('BACKGROUND',    (0,7), (-1,7), GRAY_ROW),
    ]))
    story.append(leg_t)
    story.append(PageBreak())
    return story


# ─── Secao de Assinatura ───────────────────────────────────────────────────────
def build_signature(styles):
    story = []
    page_w = landscape(A4)[0]
    margin = 3 * cm
    usable = page_w - margin

    def section_bar(text):
        data = [[Paragraph(text, styles['section_title'])]]
        t = Table(data, colWidths=[usable])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), DARK_BLUE),
            ('TOPPADDING',    (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING',   (0,0), (-1,-1), 12),
        ]))
        return t

    story.append(section_bar('APROVACAO E ASSINATURA'))
    story.append(Spacer(1, 0.5*cm))

    story.append(Paragraph(
        'Ao assinar abaixo, os responsaveis confirmam que os testes foram executados '
        'conforme descrito neste documento e que os resultados estao de acordo com os '
        'criterios de aceitacao estabelecidos.',
        styles['intro_body']))
    story.append(Spacer(1, 0.6*cm))

    sign_col = usable / 3.0
    blank = '_' * 38

    sign_data = [
        [
            Paragraph('<b>Elaborado por</b>', styles['sign_label']),
            Paragraph('<b>Revisado por</b>', styles['sign_label']),
            Paragraph('<b>Aprovado por</b>', styles['sign_label']),
        ],
        [
            Paragraph(blank, styles['sign_name']),
            Paragraph(blank, styles['sign_name']),
            Paragraph(blank, styles['sign_name']),
        ],
        [
            Paragraph('Nome / Cargo', styles['sign_name']),
            Paragraph('Nome / Cargo', styles['sign_name']),
            Paragraph('Nome / Cargo', styles['sign_name']),
        ],
        [
            Paragraph('Data: _____ / _____ / _______', styles['sign_name']),
            Paragraph('Data: _____ / _____ / _______', styles['sign_name']),
            Paragraph('Data: _____ / _____ / _______', styles['sign_name']),
        ],
    ]

    sign_t = Table(sign_data, colWidths=[sign_col, sign_col, sign_col])
    sign_t.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,0), LIGHT_BLUE),
        ('TOPPADDING',    (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING',   (0,0), (-1,-1), 10),
        ('RIGHTPADDING',  (0,0), (-1,-1), 10),
        ('GRID',          (0,0), (-1,-1), 0.5, BORDER_GRAY),
        ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
        ('LINEABOVE',     (0,1), (-1,1), 1, DARK_BLUE),
    ]))
    story.append(sign_t)
    story.append(Spacer(1, 0.8*cm))

    # Observations box
    obs_data = [
        [Paragraph('<b>Observacoes Gerais</b>', styles['cell_bold'])],
        [Paragraph(
            '\n\n\n\n\n\n\n\n',
            styles['cell_normal'])],
    ]
    obs_t = Table(obs_data, colWidths=[usable])
    obs_t.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,0), LIGHT_BLUE),
        ('GRID',          (0,0), (-1,-1), 0.5, BORDER_GRAY),
        ('TOPPADDING',    (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING',   (0,0), (-1,-1), 8),
        ('RIGHTPADDING',  (0,0), (-1,-1), 8),
    ]))
    story.append(obs_t)
    story.append(Spacer(1, 1*cm))

    # Final info box
    final_data = [
        [
            Paragraph('Versao do Documento', styles['sign_label']),
            Paragraph('Data de Geracao', styles['sign_label']),
            Paragraph('Total de Casos de Teste', styles['sign_label']),
            Paragraph('Ferramenta de Testes', styles['sign_label']),
        ],
        [
            Paragraph('v1.0', styles['sign_name']),
            Paragraph(datetime.date.today().strftime('%d/%m/%Y'), styles['sign_name']),
            Paragraph('52', styles['sign_name']),
            Paragraph('Manual / Execucao Humana', styles['sign_name']),
        ],
    ]
    final_col = usable / 4.0
    final_t = Table(final_data, colWidths=[final_col]*4)
    final_t.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,0), DARK_BLUE),
        ('TEXTCOLOR',     (0,0), (-1,0), WHITE),
        ('BACKGROUND',    (0,1), (-1,1), VERY_LIGHT),
        ('GRID',          (0,0), (-1,-1), 0.5, BORDER_GRAY),
        ('TOPPADDING',    (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING',   (0,0), (-1,-1), 8),
        ('RIGHTPADDING',  (0,0), (-1,-1), 8),
        ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN',         (0,0), (-1,-1), 'CENTER'),
    ]))
    story.append(final_t)
    return story


# ─── Montagem do PDF ──────────────────────────────────────────────────────────
def generate_pdf(output_path):
    styles = build_styles()

    doc = SimpleDocTemplate(
        output_path,
        pagesize=landscape(A4),
        leftMargin=1.5*cm,
        rightMargin=1.5*cm,
        topMargin=2.0*cm,
        bottomMargin=1.8*cm,
        title='Relatorio de Testes - App Forms Clients',
        author='App Forms Clients',
        subject='Testes Funcionais v1.0',
    )

    on_page = make_page_template(doc, styles)

    story = []

    # Capa (sem header/footer)
    cover_story = build_cover(styles)

    # Introducao
    intro_story = build_intro(styles)

    # Casos de teste
    test_story = build_test_cases(styles)

    # Resumo
    summary_story = build_summary(styles)

    # Assinatura
    sign_story = build_signature(styles)

    # Build: cover uses a blank first page, rest uses the template
    # We separate cover so it has no header/footer
    def on_first_page(canvas, doc):
        pass  # cover has its own background drawn inline

    def on_later_pages(canvas, doc):
        on_page(canvas, doc)

    # Combine everything
    full_story = cover_story + intro_story + test_story + summary_story + sign_story

    doc.build(
        full_story,
        onFirstPage=on_first_page,
        onLaterPages=on_later_pages,
    )

    print(f'PDF gerado com sucesso: {output_path}')
    size_kb = os.path.getsize(output_path) / 1024
    print(f'Tamanho do arquivo: {size_kb:.1f} KB')


if __name__ == '__main__':
    generate_pdf(OUTPUT_PATH)
