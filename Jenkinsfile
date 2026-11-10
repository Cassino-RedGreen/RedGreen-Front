pipeline {

    agent any

    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '5', artifactNumToKeepStr: '5'))
        timestamps()
        ansiColor('xterm')
        disableConcurrentBuilds()
    }

    environment {
        NOME_PIPELINE = 'RedGreen Front — CI/CD'
    }

    stages {

        stage('Instalar dependências') {
            steps {
                echo "Limpando relatórios e pacotes de builds anteriores..."
                sh 'rm -rf jest-report coverage playwright-report test-results _site dist redgreen-front-*.tar.gz'
                echo "Instalando dependências no container testes-unitarios..."
                sh 'docker exec -u 1000:1000 -w "$WORKSPACE" -e CI=true -e HUSKY=0 testes-unitarios npm ci --legacy-peer-deps'
            }
        }

        stage('Lint e formatação') {
            steps {
                echo "Executando ESLint..."
                sh 'docker exec -u 1000:1000 -w "$WORKSPACE" -e CI=true testes-unitarios npm run lint:check'
                echo "Verificando formatação com Prettier..."
                sh 'docker exec -u 1000:1000 -w "$WORKSPACE" -e CI=true testes-unitarios npm run format:check'
            }
            post {
                success { echo "Lint e formatação: SEM PROBLEMAS" }
                failure { echo "Lint e formatação: PROBLEMAS ENCONTRADOS" }
            }
        }

        stage('Testes unitários') {
            steps {
                echo "Executando testes unitários (Jest) com cobertura..."
                sh 'mkdir -p jest-report'
                sh 'docker exec -u 1000:1000 -w "$WORKSPACE" -e CI=true testes-unitarios npm run test -- --ci --coverage --json --outputFile=jest-report/resultado.json'
            }
            post {
                success { echo "Testes unitários: TODOS OS TESTES PASSARAM" }
                failure { echo "Testes unitários: FALHAS DETECTADAS" }
            }
        }

        stage('Build') {
            steps {
                echo "Gerando o build de produção (Vite)..."
                sh 'docker exec -u 1000:1000 -w "$WORKSPACE" -e CI=true -e VITE_API_BASE_URL testes-unitarios npm run build'
                echo "Empacotando dist/ em redgreen-front-${BUILD_NUMBER}.tar.gz..."
                sh 'tar -czf "redgreen-front-${BUILD_NUMBER}.tar.gz" -C dist .'
            }
            post {
                success { echo "Build: PACOTE GERADO" }
                failure { echo "Build: FALHA AO GERAR O PACOTE" }
            }
        }

        stage('Testes E2E') {
            steps {
                echo "Executando testes E2E (Playwright) contra http://frontend..."
                sh 'docker exec -u 1000:1000 -w "$WORKSPACE" -e CI=true -e E2E_BASE_URL=http://frontend -e E2E_ADMIN_EMAIL -e E2E_ADMIN_PASSWORD testes-e2e npx playwright test'
            }
            post {
                always {
                    echo "Gerando o site do relatório E2E..."
                    sh 'docker exec -u 1000:1000 -w "$WORKSPACE" testes-e2e npm run report:site || true'
                }
                success { echo "Testes E2E: TODOS OS TESTES PASSARAM" }
                failure { echo "Testes E2E: FALHAS DETECTADAS" }
            }
        }

    }

    post {
        success {
            archiveArtifacts artifacts: 'redgreen-front-*.tar.gz',
                             fingerprint: true
            echo "Pipeline concluído com SUCESSO!"
        }
        failure { echo "Pipeline FALHOU. Verificar logs acima." }
        unstable { echo "Pipeline INSTÁVEL — alguns testes falharam." }
        always {
            archiveArtifacts artifacts: 'jest-report/**, coverage/**, playwright-report/**, test-results/**, _site/**',
                             allowEmptyArchive: true
            script {
                def StatusEmail = currentBuild.currentResult == 'SUCCESS' ? 'sucesso' : 'falha'
                sh "enviar-email.sh ${StatusEmail} \"\$BUILD_URL\" \"\$DESTINATARIO_EMAIL\""
            }
            echo "Pipeline : ${env.NOME_PIPELINE}"
            echo "Build    : #${BUILD_NUMBER}"
            echo "Resultado: ${currentBuild.currentResult}"
            echo "Duração  : ${currentBuild.durationString}"
        }
    }

}
