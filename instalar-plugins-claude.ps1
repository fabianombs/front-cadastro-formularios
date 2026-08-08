<#
    instalar-plugins-claude.ps1
    Instala e configura o ambiente Claude Code + plugins no Windows.
    Gerado em 06/08/2026.

    Uso:
        cd C:\projetos\Fabiano\front-cadastro-formularios
        powershell -ExecutionPolicy Bypass -File .\instalar-plugins-claude.ps1

    O que este script FAZ sozinho:
      - verifica Node, npm, Python, git
      - instala o Claude Code CLI se faltar
      - roda o instalador do claude-mem (hooks + worker)
      - instala o Headroom (proxy de reducao de tokens)
      - instala a skill task-observer no projeto atual
      - cria/atualiza o CLAUDE.md para forcar a skill
      - tenta registrar os marketplaces de plugin

    O que ele NAO faz (precisa ser dentro do Claude Code):
      - /plugin install  -> o script imprime as instrucoes no final
#>

$ErrorActionPreference = 'Continue'
$projeto = Get-Location

function Titulo($t) {
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor DarkCyan
    Write-Host "  $t" -ForegroundColor Cyan
    Write-Host ("=" * 70) -ForegroundColor DarkCyan
}
function Ok($m)    { Write-Host "  [OK]    $m" -ForegroundColor Green }
function Aviso($m) { Write-Host "  [!]     $m" -ForegroundColor Yellow }
function Erro($m)  { Write-Host "  [ERRO]  $m" -ForegroundColor Red }
function Existe($cmd) { return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

$pendencias = @()

# ---------------------------------------------------------------- ETAPA 0
Titulo "ETAPA 0 - Verificando pre-requisitos"

if (Existe node) {
    $nodeV = (node --version) -replace 'v',''
    $nodeMajor = [int]($nodeV.Split('.')[0])
    # claude-mem exige Node 20+; abaixo disso o worker nao sobe
    if ($nodeMajor -ge 20) { Ok "Node $nodeV" }
    else { Erro "Node $nodeV - claude-mem exige 20+. Atualize em https://nodejs.org"; $pendencias += "Atualizar Node para 20+" }
} else {
    Erro "Node nao encontrado. Instale o LTS em https://nodejs.org e rode o script de novo."
    exit 1
}

if (Existe git)    { Ok "git $((git --version).Split(' ')[2])" } else { Aviso "git ausente (opcional)" }

if (Existe python) { Ok "Python $((python --version).Split(' ')[1])" }
else { Aviso "Python ausente - o Headroom (etapa 3) sera pulado"; $pendencias += "Instalar Python 3.10+ para o Headroom" }

# ---------------------------------------------------------------- ETAPA 1
Titulo "ETAPA 1 - Claude Code CLI"

if (Existe claude) {
    Ok "Claude Code ja instalado: $(claude --version)"
} else {
    Aviso "Instalando @anthropic-ai/claude-code (pode demorar alguns minutos)..."
    npm install -g @anthropic-ai/claude-code
    # o PATH da sessao atual nao enxerga o binario recem-instalado
    $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' +
                [Environment]::GetEnvironmentVariable('Path','User')
    if (Existe claude) { Ok "Instalado: $(claude --version)" }
    else { Erro "Instalou mas nao esta no PATH. Feche e reabra o PowerShell."; $pendencias += "Reabrir o terminal para o PATH" }
}

# ---------------------------------------------------------------- ETAPA 2
Titulo "ETAPA 2 - claude-mem (memoria persistente)"

$memDir = Join-Path $env:USERPROFILE ".claude-mem"
if (Test-Path $memDir) { Aviso "Pasta .claude-mem ja existe - o instalador vai reaproveitar os dados" }

# npx claude-mem install e o unico caminho que registra os hooks;
# npm install -g claude-mem instala so o SDK e nao ativa nada
Write-Host "  Rodando: npx claude-mem install" -ForegroundColor DarkGray
Write-Host "  (interativo - aceite os padroes quando perguntar)" -ForegroundColor DarkGray
npx --yes claude-mem install
if ($LASTEXITCODE -eq 0) { Ok "claude-mem configurado" }
else { Erro "Falhou. Rode manualmente: npx claude-mem install"; $pendencias += "Reexecutar npx claude-mem install" }

# ---------------------------------------------------------------- ETAPA 3
Titulo "ETAPA 3 - Headroom (reducao de tokens)"

if (Existe python) {
    if (Existe headroom) {
        Ok "Headroom ja instalado"
    } else {
        pip install "headroom-ai[all]"
        $env:Path = [Environment]::GetEnvironmentVariable('Path','User') + ';' + $env:Path
    }
    if (Existe headroom) {
        Write-Host "  Health check:" -ForegroundColor DarkGray
        headroom doctor
        Ok "Para usar: 'headroom wrap claude' no lugar de 'claude'"
    } else {
        Aviso "headroom nao entrou no PATH - reabra o terminal"
        $pendencias += "Reabrir terminal e rodar: headroom doctor"
    }
} else {
    Aviso "Pulado - Python ausente"
}

# ---------------------------------------------------------------- ETAPA 4
Titulo "ETAPA 4 - Skill task-observer (neste projeto)"

npx --yes skills add rebelytics/one-skill-to-rule-them-all --skill task-observer --agent claude-code
$skillDir = Join-Path $projeto ".claude\skills\task-observer"
if (Test-Path $skillDir) { Ok "Skill instalada em .claude\skills\task-observer" }
else { Aviso "Nao confirmei a pasta da skill - verifique .claude\skills\" }

# A skill dispara por match de descricao, o que falha bastante.
# Instrucao explicita no CLAUDE.md torna a invocacao confiavel.
$claudeMd = Join-Path $projeto "CLAUDE.md"
$bloco = @"

## Skills

No inicio de cada sessao, invoque a skill ``task-observer`` para registrar
oportunidades de melhoria de workflow durante o trabalho.
"@

if (Test-Path $claudeMd) {
    if ((Get-Content $claudeMd -Raw) -match 'task-observer') {
        Ok "CLAUDE.md ja referencia a task-observer"
    } else {
        Add-Content -Path $claudeMd -Value $bloco -Encoding UTF8
        Ok "Bloco de skills adicionado ao CLAUDE.md existente"
    }
} else {
    Set-Content -Path $claudeMd -Value "# Projeto: front-cadastro-formularios$bloco" -Encoding UTF8
    Ok "CLAUDE.md criado"
}

# ---------------------------------------------------------------- ETAPA 5
Titulo "ETAPA 5 - Marketplaces de plugin"

$marketplaces = @(
    'thedotmack/claude-mem',
    'rebelytics/one-skill-to-rule-them-all',
    'phazurlabs/ux-ui-mastery'
)

# Versoes recentes do CLI expoem 'claude plugin' fora do REPL.
# Se nao existir, cai no fallback manual.
$temSubcomando = $false
if (Existe claude) {
    claude plugin --help 2>&1 | Out-Null
    $temSubcomando = ($LASTEXITCODE -eq 0)
}

if ($temSubcomando) {
    foreach ($m in $marketplaces) {
        claude plugin marketplace add $m
        if ($LASTEXITCODE -eq 0) { Ok "marketplace: $m" } else { Aviso "falhou: $m" }
    }
} else {
    Aviso "Sua versao do CLI nao expoe 'claude plugin' fora do REPL."
    Aviso "Os marketplaces terao que ser adicionados dentro do Claude Code."
    $pendencias += "Adicionar marketplaces dentro do Claude Code (ver abaixo)"
}

# ---------------------------------------------------------------- FINAL
Titulo "RESUMO"

if ($pendencias.Count -gt 0) {
    Write-Host "  Pendencias:" -ForegroundColor Yellow
    $pendencias | ForEach-Object { Write-Host "    - $_" -ForegroundColor Yellow }
    Write-Host ""
}

Write-Host @"
  PASSO FINAL - obrigatoriamente dentro do Claude Code.

  1) Rode:   claude          (ou: headroom wrap claude)

  2) Se as linhas abaixo ainda nao foram aplicadas, cole uma por vez:

       /plugin marketplace add thedotmack/claude-mem
       /plugin marketplace add rebelytics/one-skill-to-rule-them-all
       /plugin marketplace add phazurlabs/ux-ui-mastery

  3) Instale os plugins:

       /plugin install claude-mem
       /plugin install ux-ui-mastery@ux-ui-mastery-marketplace

     (o sufixo -marketplace no segundo NAO e erro de digitacao)

     Em caso de duvida no ID, digite so  /plugin  e escolha no menu.

  4) Saia com /exit e entre de novo. Hooks so ativam em sessao nova.

  5) Confira:   /plugin list     e depois   /accessibility-check

"@ -ForegroundColor White

Ok "Script concluido."
