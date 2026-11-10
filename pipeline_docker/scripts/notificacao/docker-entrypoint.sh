#!/bin/bash

set -e

echo "=========================================="
echo "  Pipeline RedGreen Front — Iniciando Jenkins"
echo "=========================================="

if [[ -S /var/run/docker.sock ]]; then
    chmod 666 /var/run/docker.sock
    echo "[OK] Permissão do Docker socket ajustada."
else
    echo "[AVISO] Docker socket não encontrado em /var/run/docker.sock."
    echo "        Certifique-se de que o volume está montado no docker-compose.yml."
fi

sed -e "s|GMAIL_USER_PLACEHOLDER|${GMAIL_USER:-}|g" \
    -e "s|GMAIL_PASS_PLACEHOLDER|${GMAIL_PASS:-}|g" \
    /etc/msmtprc.template > /etc/msmtprc
chown jenkins:jenkins /etc/msmtprc
chmod 600 /etc/msmtprc
touch /var/log/msmtp.log
chown jenkins:jenkins /var/log/msmtp.log
echo "[OK] Configuração do msmtp gerada em /etc/msmtprc."

echo "[INFO] Iniciando Jenkins como usuário jenkins..."
exec gosu jenkins /usr/bin/tini -- /usr/local/bin/jenkins.sh "$@"
