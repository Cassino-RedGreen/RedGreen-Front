#!/bin/bash

set -euo pipefail

STATUS="${1:-}"
BUILD_URL="${2:-}"
DESTINATARIO="${3:-}"

if [[ -z "$STATUS" || -z "$BUILD_URL" || -z "$DESTINATARIO" ]]; then
    echo "[ERRO] Uso: $0 <sucesso|falha> <build_url> <destinatario>"
    echo "       Exemplo: $0 sucesso http://localhost:8080/job/redgreen-front/1/ aluno@email.com"
    exit 1
fi

if [[ "$STATUS" != "sucesso" && "$STATUS" != "falha" ]]; then
    echo "[ERRO] Status deve ser 'sucesso' ou 'falha'. Recebido: '$STATUS'"
    exit 1
fi

TIMESTAMP=$(date '+%d/%m/%Y às %H:%M:%S')
ARTEFATOS_URL="${BUILD_URL}artifact"
JOB_NAME="${JOB_NAME:-RedGreen Front}"
BUILD_NUMBER="${BUILD_NUMBER:-N/A}"

if [[ "$STATUS" == "sucesso" ]]; then
    EMOJI="✅"
    ASSUNTO="[SUCESSO] Pipeline RedGreen Front — Build #${BUILD_NUMBER} passou!"
    MENSAGEM_PRINCIPAL="Todas as etapas foram concluídas com sucesso."
    DETALHES="O pipeline executou lint, testes unitários, build e testes E2E sem nenhuma falha."
else
    EMOJI="❌"
    ASSUNTO="[FALHA] Pipeline RedGreen Front — Build #${BUILD_NUMBER} falhou!"
    MENSAGEM_PRINCIPAL="Uma ou mais etapas falharam durante a execução."
    DETALHES="Verifique os relatórios e logs do Jenkins para identificar o problema."
fi

CORPO_EMAIL=$(cat <<EOF
From: Pipeline RedGreen Front <${GMAIL_USER}>
To: ${DESTINATARIO}
Subject: ${ASSUNTO}
Content-Type: text/plain; charset=UTF-8
MIME-Version: 1.0

${EMOJI} RESULTADO DO PIPELINE — ${JOB_NAME}
================================================

Status    : $(echo "$STATUS" | tr '[:lower:]' '[:upper:]')
Build     : #${BUILD_NUMBER}
Data/Hora : ${TIMESTAMP}

${MENSAGEM_PRINCIPAL}
${DETALHES}

LINKS ÚTEIS
-----------
📋 Ver build no Jenkins         : ${BUILD_URL}
📦 Artefatos do build           : ${ARTEFATOS_URL}/
📊 Relatório dos testes (Jest)  : ${ARTEFATOS_URL}/jest-report/resultado.json
📊 Cobertura (Jest)             : ${ARTEFATOS_URL}/coverage/lcov-report/index.html
📊 Relatório E2E (Playwright)   : ${ARTEFATOS_URL}/playwright-report/index.html
📊 Site do relatório E2E        : ${ARTEFATOS_URL}/_site/index.html

ETAPAS EXECUTADAS
-----------------
• Lint e formatação (ESLint + Prettier)
• Testes unitários (Jest)
• Build e empacotamento (Vite)
• Testes E2E (Playwright)

--
Mensagem automática gerada pelo pipeline de CI/CD
Inatel — Qualidade e Configuração de Software (S07)
EOF
)

echo "[INFO] Enviando e-mail de '${STATUS}' para '${DESTINATARIO}'..."

if echo "$CORPO_EMAIL" | msmtp -a default "$DESTINATARIO"; then
    echo "[OK] E-mail enviado com sucesso para ${DESTINATARIO}"
    exit 0
else
    echo "[AVISO] Falha ao enviar e-mail. Verifique as credenciais do Gmail."
    echo "        O pipeline continuará normalmente."
    exit 0
fi
