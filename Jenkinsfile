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
        PIPELINE_NAME = 'RedGreen Front — CI/CD'
    }

    stages {

        stage('Install Dependencies') {
            steps {
                echo "Limpando relatórios e pacotes de builds anteriores..."
                sh 'rm -rf reports playwright-report test-results _site dist redgreen-front-*.tar.gz'
                echo "Instalando dependências no container redgreen-front-unit-tests..."
                sh 'docker exec -u 1000:1000 -w "$WORKSPACE" -e CI=true -e HUSKY=0 redgreen-front-unit-tests npm ci --legacy-peer-deps'
            }
            post {
                failure { markFailedStage() }
            }
        }

        stage('Quality') {
            parallel {

                stage('Lint') {
                    steps {
                        echo "Executando ESLint..."
                        sh 'docker exec -u 1000:1000 -w "$WORKSPACE" -e CI=true redgreen-front-unit-tests npm run lint:check'
                    }
                    post {
                        success { echo "Lint: SEM PROBLEMAS" }
                        failure {
                            echo "Lint: PROBLEMAS ENCONTRADOS"
                            markFailedStage()
                        }
                    }
                }

                stage('Format') {
                    steps {
                        echo "Verificando formatação com Prettier..."
                        sh 'docker exec -u 1000:1000 -w "$WORKSPACE" -e CI=true redgreen-front-unit-tests npm run format:check'
                    }
                    post {
                        success { echo "Formatação: SEM PROBLEMAS" }
                        failure {
                            echo "Formatação: PROBLEMAS ENCONTRADOS"
                            markFailedStage()
                        }
                    }
                }

            }
        }

        stage('Unit Tests') {
            steps {
                echo "Executando testes unitários (Jest) com cobertura..."
                sh 'mkdir -p reports/unit'
                sh 'docker exec -u 1000:1000 -w "$WORKSPACE" -e CI=true redgreen-front-unit-tests npm run test -- --ci --coverage --coverageDirectory=reports/unit/coverage --json --outputFile=reports/unit/results.json'
            }
            post {
                success { echo "Testes unitários: TODOS OS TESTES PASSARAM" }
                failure {
                    echo "Testes unitários: FALHAS DETECTADAS"
                    markFailedStage()
                }
            }
        }

        stage('Build & Package') {
            steps {
                echo "Gerando o build de produção (Vite)..."
                sh 'docker exec -u 1000:1000 -w "$WORKSPACE" -e CI=true -e VITE_API_BASE_URL redgreen-front-unit-tests npm run build'
                echo "Empacotando dist/..."
                sh 'tar -czf "redgreen-front-${BUILD_NUMBER}-$(printf %.7s "$GIT_COMMIT").tar.gz" -C dist .'
            }
            post {
                success { echo "Build: PACOTE GERADO" }
                failure {
                    echo "Build: FALHA AO GERAR O PACOTE"
                    markFailedStage()
                }
            }
        }

        stage('E2E Tests') {
            steps {
                echo "Executando testes E2E (Playwright) contra http://redgreen-front-app..."
                withCredentials([string(credentialsId: 'e2e-admin-password', variable: 'E2E_ADMIN_PASSWORD')]) {
                    sh 'docker exec -u 1000:1000 -w "$WORKSPACE" -e CI=true -e E2E_BASE_URL=http://redgreen-front-app -e E2E_ADMIN_EMAIL -e E2E_ADMIN_PASSWORD redgreen-front-e2e-tests npx playwright test'
                }
            }
            post {
                always {
                    echo "Gerando o site do relatório E2E..."
                    sh 'docker exec -u 1000:1000 -w "$WORKSPACE" redgreen-front-e2e-tests npm run report:site || true'
                }
                success { echo "Testes E2E: TODOS OS TESTES PASSARAM" }
                failure {
                    echo "Testes E2E: FALHAS DETECTADAS"
                    markFailedStage()
                }
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
            archiveArtifacts artifacts: 'reports/**, playwright-report/**, test-results/**, _site/**',
                             allowEmptyArchive: true
            withCredentials([string(credentialsId: 'smtp-password', variable: 'SMTP_PASSWORD')]) {
                script {
                    withEnv([
                        "BUILD_STATUS=${currentBuild.currentResult}",
                        "BUILD_DURATION=${currentBuild.durationString.replace(' and counting', '')}",
                    ]) {
                        def EmailExitCode = sh(returnStatus: true, script: 'python3 scripts/send-pipeline-email.py')
                        if (EmailExitCode != 0) {
                            echo "Aviso: o e-mail de notificação não foi enviado (código ${EmailExitCode}). O resultado do build não foi alterado."
                        }
                    }
                }
            }
            echo "Pipeline : ${env.PIPELINE_NAME}"
            echo "Build    : #${BUILD_NUMBER}"
            echo "Resultado: ${currentBuild.currentResult}"
            echo "Duração  : ${currentBuild.durationString}"
        }
    }

}

def markFailedStage() {
    env.FAILED_STAGE = env.FAILED_STAGE ? "${env.FAILED_STAGE}, ${env.STAGE_NAME}" : env.STAGE_NAME
}
