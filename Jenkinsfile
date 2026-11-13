pipeline {

    agent any

    parameters {
        booleanParam(
            name: 'PUBLISH_IMAGE',
            defaultValue: false,
            description: 'Publica a imagem do front no Docker Hub a partir desta branch (na main a publicação é automática).'
        )
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '5', artifactNumToKeepStr: '5'))
        timestamps()
        ansiColor('xterm')
        disableConcurrentBuilds()
    }

    environment {
        PIPELINE_NAME = 'RedGreen Front — CI/CD'
        APP_IMAGE = 'redgreen-front-app'
    }

    stages {

        stage('Prepare') {
            steps {
                script {
                    env.IMAGE_TAG = "${env.BUILD_NUMBER}-${env.GIT_COMMIT.take(7)}"
                    env.CI_PREFIX = "redgreen-front-ci-${env.BUILD_NUMBER}"
                    env.CI_NETWORK = "${env.CI_PREFIX}-net"
                }
                echo "Imagem do build: ${env.APP_IMAGE}:${env.IMAGE_TAG}"
                echo "Limpando relatórios e pacotes de builds anteriores..."
                sh 'rm -rf reports playwright-report test-results _site dist redgreen-front-*.tar.gz'
            }
            post {
                failure { markFailedStage() }
            }
        }

        stage('Install Dependencies') {
            steps {
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
                echo "Construindo a imagem ${env.APP_IMAGE}:${env.IMAGE_TAG}..."
                sh '''
                    docker build -f docker/Dockerfile.app --build-arg VITE_API_BASE_URL -t "$APP_IMAGE:$IMAGE_TAG" .
                    docker create --name "$CI_PREFIX-dist" "$APP_IMAGE:$IMAGE_TAG"
                    mkdir -p dist
                    docker cp "$CI_PREFIX-dist:/usr/share/nginx/html/." dist/
                    docker rm "$CI_PREFIX-dist"
                    tar -czf "redgreen-front-$IMAGE_TAG.tar.gz" -C dist .
                '''
            }
            post {
                success { echo "Build: IMAGEM E PACOTE GERADOS" }
                failure {
                    echo "Build: FALHA AO GERAR A IMAGEM OU O PACOTE"
                    markFailedStage()
                }
            }
        }

        stage('E2E Tests') {
            steps {
                echo "Subindo ${env.APP_IMAGE}:${env.IMAGE_TAG} na rede ${env.CI_NETWORK}..."
                sh '''
                    docker network create "$CI_NETWORK"
                    docker run -d --name "$CI_PREFIX-app" --network "$CI_NETWORK" --network-alias redgreen-front-app "$APP_IMAGE:$IMAGE_TAG"
                    docker network connect "$CI_NETWORK" redgreen-front-e2e-tests
                    for attempt in $(seq 1 30); do
                        if docker exec redgreen-front-e2e-tests node -e "fetch('http://redgreen-front-app/').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"; then
                            exit 0
                        fi
                        sleep 1
                    done
                    echo "O redgreen-front-app não respondeu em 30 segundos."
                    exit 1
                '''
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

        stage('Publish to Docker Hub') {
            when {
                anyOf {
                    expression { env.GIT_BRANCH == 'origin/main' }
                    expression { params.PUBLISH_IMAGE }
                }
            }
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'DOCKERHUB_USER', passwordVariable: 'DOCKERHUB_TOKEN')]) {
                    sh '''
                        : "${DOCKERHUB_REPO:?Defina DOCKERHUB_REPO no .env do Jenkins (ex.: usuario/redgreen-front)}"
                        echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USER" --password-stdin
                        trap 'docker logout >/dev/null 2>&1 || true' EXIT
                        docker tag "$APP_IMAGE:$IMAGE_TAG" "$DOCKERHUB_REPO:$IMAGE_TAG"
                        docker push "$DOCKERHUB_REPO:$IMAGE_TAG"
                        if [ "${GIT_BRANCH:-}" = "origin/main" ]; then
                            docker tag "$APP_IMAGE:$IMAGE_TAG" "$DOCKERHUB_REPO:latest"
                            docker push "$DOCKERHUB_REPO:latest"
                        fi
                    '''
                }
                script {
                    def LatestSuffix = env.GIT_BRANCH == 'origin/main' ? ' (and latest)' : ''
                    env.PUBLISHED_IMAGE = "${env.DOCKERHUB_REPO}:${env.IMAGE_TAG}${LatestSuffix}"
                }
            }
            post {
                success { echo "Docker Hub: IMAGEM PUBLICADA (${env.PUBLISHED_IMAGE})" }
                failure {
                    echo "Docker Hub: FALHA AO PUBLICAR A IMAGEM"
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
            sh '''
                if [ -n "${CI_PREFIX:-}" ]; then
                    docker network disconnect "$CI_NETWORK" redgreen-front-e2e-tests >/dev/null 2>&1 || true
                    docker rm -f "$CI_PREFIX-app" "$CI_PREFIX-dist" >/dev/null 2>&1 || true
                    docker network rm "$CI_NETWORK" >/dev/null 2>&1 || true
                    docker image rm "$APP_IMAGE:$IMAGE_TAG" >/dev/null 2>&1 || true
                    if [ -n "${DOCKERHUB_REPO:-}" ]; then
                        docker image rm "$DOCKERHUB_REPO:$IMAGE_TAG" "$DOCKERHUB_REPO:latest" >/dev/null 2>&1 || true
                    fi
                fi
            '''
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
