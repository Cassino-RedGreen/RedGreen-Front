# RedGreen Frontend

Frontend do projeto **RedGreen**, desenvolvido para a disciplina **C14 - Engenharia de Software** e containerizado com pipeline em Jenkins na disciplina **S07**. A aplicacao implementa a interface web de um cassino com autenticação, carteira de fichas, ranking, bonus diario, administracao de mesas e dois jogos principais: **Slot Machine** e **Gambit**.

**Imagem no Docker Hub:** [phandradd/redgreen-front-jenkins](https://hub.docker.com/r/phandradd/redgreen-front-jenkins), construida a partir de `docker/Dockerfile.jenkins` e publicada pelo pipeline. Detalhes na secao [16. Pipeline CI/CD](#imagem-no-docker-hub).

Este documento foi elaborado a partir da analise do codigo-fonte existente neste repositorio. Funcionalidades, rotas, endpoints e testes descritos aqui correspondem ao que foi identificado no projeto.

## Indice

- [Autores](#autores)
- [1. Visao Geral do Projeto](#1-visao-geral-do-projeto)
- [2. Funcionalidades Implementadas](#2-funcionalidades-implementadas)
- [3. Tecnologias e Ferramentas](#3-tecnologias-e-ferramentas)
- [4. Arquitetura Frontend](#4-arquitetura-frontend)
- [5. Estrutura de Diretorios](#5-estrutura-de-diretorios)
- [6. Instalacao e Execucao](#6-instalacao-e-execucao)
- [7. Variaveis de Ambiente](#7-variaveis-de-ambiente)
- [8. Rotas da Aplicacao](#8-rotas-da-aplicacao)
- [9. Integracao com API](#9-integracao-com-api)
- [10. Gerenciamento de Estado](#10-gerenciamento-de-estado)
- [11. Sistema de Formularios](#11-sistema-de-formularios)
- [12. Sistema de Jogos](#12-sistema-de-jogos)
- [13. Interface e UX](#13-interface-e-ux)
- [14. Testes Automatizados](#14-testes-automatizados)
- [15. Qualidade de Codigo](#15-qualidade-de-codigo)
- [16. Pipeline CI/CD](#16-pipeline-cicd)
- [17. Decisoes Tecnicas](#17-decisoes-tecnicas)
- [18. Uso de IA](#18-uso-de-ia)
- [19. Metodologia de Desenvolvimento](#19-metodologia-de-desenvolvimento)
- [20. Dinâmica de Desenvolvimento](#20-dinâmica-de-desenvolvimento)
- [21. Historias de Usuario](#21-historias-de-usuario)
- [22. Conclusao](#22-conclusao)

## Autores

Projeto desenvolvido pelas equipes de **Backend** ([RedGreen-Back](https://github.com/Cassino-RedGreen/RedGreen-Back)) e **Frontend** (este repositório).

### Backend

| Autor                                   | GitHub                                         |
| --------------------------------------- | ---------------------------------------------- |
| Patrick Augusto Lins de Oliveira Damião | [@Pack0042](https://github.com/Pack0042)       |
| Antonio Feliciano                       | [@AntonioFSN2](https://github.com/AntonioFSN2) |

### Frontend

| Autor                         | GitHub                                               |
| ----------------------------- | ---------------------------------------------------- |
| Danilo Henrique Maia da Silva | [@DaniloSilva31](https://github.com/DaniloSilva31)   |
| Pedro Henrique Andrade        | [@phandrad3](https://github.com/phandrad3)           |
| Pedro Armengol de Oliveira    | [@Armengolz](https://github.com/Armengolz)           |
| Pedro R. Nogueira             | [@PedroRNogueira](https://github.com/PedroRNogueira) |

## 1. Visao Geral do Projeto

O RedGreen Frontend e uma aplicacao web construida com **React**, **TypeScript** e **Vite**, com interface visual inspirada em cassino e pixel art. A aplicacao consome uma API HTTP externa para autenticacao, dados do usuario, saldo de fichas, ranking, bonus diario, mesas e sessoes de jogo.

O projeto segue uma separacao em camadas:

- `domain`: tipos e schemas de dominio.
- `application`: hooks de aplicacao e acesso a dados com SWR.
- `infrastructure`: cliente HTTP, ambiente e cookies.
- `presentation`: paginas, componentes de UI e motores visuais dos jogos.

No ponto de entrada, `src/main.tsx` registra as variaveis de ambiente em runtime, monta o `BrowserRouter`, aplica `AppProviders` e renderiza `AppRoutes`.

## 2. Funcionalidades Implementadas

Funcionalidades identificadas no codigo:

- Tela inicial com HUD, saldo de fichas, menu de usuario, ranking, bonus diario e cards de acesso aos jogos.
- Fluxo de identificacao por e-mail, login e cadastro na pagina `/login`.
- Persistencia de token JWT em cookie `token`.
- Logout com limpeza do cookie de autenticacao.
- Menu de usuario com edicao de perfil e exclusao de conta.
- Modal de sessao expirada disparado quando a API retorna `401` para usuario autenticado.
- Consulta de perfil do usuario e saldo de fichas com SWR.
- Ranking de jogadores por fichas.
- Bonus diario com progresso de 7 dias e chamada de resgate.
- Listagem de mesas de Slot Machine.
- Criacao, edicao, ativacao/desativacao e exclusao de mesas de Slot Machine para usuario administrador.
- Listagem de mesas de Gambit.
- Criacao, edicao, ativacao/desativacao e exclusao de mesas de Gambit para usuario administrador.
- Bloqueio visual de mesas quando o usuario nao esta logado, nao possui fichas suficientes ou a mesa esta inativa.
- Aviso quando existe sessao ativa em outra mesa antes de iniciar uma nova partida.
- Jogo Slot Machine com giro, animacao de rolos, reroll por reel, contador de rerolls, cash-out e restauracao de sessao ativa.
- Jogo Gambit com compra de cartas, tabuleiro visual, queima de cartas, eventos, efeitos, selecoes especiais, feedback de pontuacao e cash-out automatico quando a sessao termina.
- Testes automatizados para componentes, hooks, mapeadores, clientes de API e fluxos dos jogos.

Funcionalidades declaradas em rotas mas ainda nao implementadas de forma completa:

- `/register`: renderiza apenas um placeholder `Register`.
- `/dashboard`: renderiza apenas um placeholder `Dashboard`.
- `/roulette-room`: renderiza apenas um placeholder `Roulette Room`.

## 3. Tecnologias e Ferramentas

| Categoria                    | Ferramentas                                      |
| ---------------------------- | ------------------------------------------------ |
| **Core**                     | React 19, React DOM, TypeScript 5.9              |
| **Build e Desenvolvimento**  | Vite 8                                           |
| **Roteamento**               | React Router DOM 6                               |
| **Comunicação HTTP e Cache** | Axios, SWR                                       |
| **Estilização e Ícones**     | Tailwind CSS, lucide-react                       |
| **Animações**                | Framer Motion                                    |
| **Motor de Jogos**           | PixiJS, `@pixi/react`                            |
| **Formulários e Validação**  | React Hook Form, Zod                             |
| **Testes**                   | Jest, ts-jest, jsdom, React Testing Library      |
| **Testes E2E**               | Playwright (Chromium, Firefox e WebKit)          |
| **Testes de Performance**    | Lighthouse CI, Playwright                        |
| **Qualidade e Padronização** | ESLint, Prettier, Husky, Commitlint, lint-staged |
| **Containers**               | Docker, Docker Compose, Nginx                    |
| **CI/CD**                    | Jenkins (em container), Docker Hub               |

Observacao: embora `react-hook-form`, `@hookform/resolvers` e `zod` estejam instalados, os formularios atualmente implementados usam majoritariamente `useState` e validacoes manuais. Os schemas Zod existentes em `src/domain/schemas.ts` nao aparecem integrados aos formularios analisados.

## 4. Arquitetura Frontend

A arquitetura observada e organizada por responsabilidades:

- **Entrada da aplicacao:** `src/main.tsx`.
- **Provedores globais:** `src/AppProviders.tsx`, responsavel por configurar `SWRConfig`.
- **Roteamento:** `src/routes.tsx` e `src/paths.ts`.
- **Dominio:** `src/domain/types.ts` e `src/domain/schemas.ts`.
- **Aplicacao:** hooks em `src/application/hooks`.
- **Infraestrutura:** cliente Axios, cookies e ambiente em `src/infrastructure`.
- **Apresentacao:** paginas, UI e jogos em `src/presentation`.

O projeto utiliza um modelo hibrido:

- Componentes React tradicionais para telas, HUDs, modais, botoes e formularios.
- PixiJS diretamente em componentes de jogo para renderizacao canvas/WebGL.
- Framer Motion para transicoes, overlays e animacoes de UI.

## 5. Estrutura de Diretorios

```text
RedGreen-Front/
|-- public/
|   |-- Gambit/
|   |-- SlotMachine/
|   |-- favicon.svg
|   `-- icons.svg
|-- src/
|   |-- application/
|   |   `-- hooks/
|   |-- assets/
|   |-- domain/
|   |-- infrastructure/
|   |   `-- http/
|   |-- presentation/
|   |   |-- games/
|   |   |-- pages/
|   |   `-- ui/
|   |-- App.css
|   |-- App.tsx
|   |-- AppProviders.tsx
|   |-- config.ts
|   |-- index.css
|   |-- main.tsx
|   |-- paths.ts
|   |-- routes.tsx
|   |-- setupTests.ts
|   `-- validators.ts
|-- test/
|-- e2e/
|   |-- helpers/
|   `-- TC-001.spec.ts ... TC-020.spec.ts
|-- docker/
|   |-- nginx/
|   |-- Dockerfile.e2e-tests
|   |-- Dockerfile.jenkins
|   `-- Dockerfile.unit-tests
|-- jenkins/
|   |-- casc.yaml
|   `-- plugins.txt
|-- performance/
|-- scripts/
|   |-- BuildReportSite.mjs
|   `-- send-pipeline-email.py
|-- .github/
|   `-- PULL_REQUEST_TEMPLATE
|-- .husky/
|-- .env.example
|-- docker-compose.yml
|-- Dockerfile
|-- Dockerfile.performance
|-- eslint.config.js
|-- Jenkinsfile
|-- jest.config.js
|-- playwright.config.ts
|-- package.json
|-- tailwind.config.js
|-- tsconfig.json
|-- tsconfig.app.json
|-- tsconfig.node.json
`-- vite.config.ts
```

Observacao tecnica: `src/App.tsx` e `src/App.css` mantem codigo residual do template do Vite, mas `src/main.tsx` renderiza `AppRoutes`, nao `App`.

## 6. Instalacao e Execucao

Pre-requisitos:

- Node.js 22 atualizado, mesma versao principal do container de testes do pipeline.
- npm.
- Backend em execucao para os fluxos que consomem a API real.
- Docker (Docker Desktop no Windows), para a execucao com containers.

Instalacao:

```bash
npm install --legacy-peer-deps
```

O comando segue a instalacao usada no CI para compatibilidade entre dependencias. Fora de CI, o script `postinstall` executa `npx playwright install` para instalar os navegadores dos testes. Copie `.env.example` para `.env` e ajuste a URL da API antes de iniciar a aplicacao.

Execucao em desenvolvimento:

```bash
npm run dev
```

Build de producao:

```bash
npm run build
```

Preview do build:

```bash
npm run preview
```

Testes unitarios:

```bash
npm test
```

Testes end-to-end:

```bash
npm run test:e2e
```

Lint:

```bash
npm run lint
```

Formatacao:

```bash
npm run format
```

### Execucao com Docker Compose

O `docker-compose.yml` sobe a aplicacao completa e o ambiente de CI com um unico comando. Execute na raiz do repositorio, com o Docker em execucao e o repositorio [RedGreen-Back](https://github.com/Cassino-RedGreen/RedGreen-Back) clonado na mesma pasta pai deste projeto, ou informe outro caminho em `BACKEND_PATH`.

Copie `.env.example` para `.env` e preencha ao menos `JENKINS_ADMIN_USER`, `JENKINS_ADMIN_PASSWORD`, `EMAIL_TO` e `JWT_SECRET`; sem elas o Compose nao inicia. As demais variaveis estao descritas na secao [7. Variaveis de Ambiente](#7-variaveis-de-ambiente).

```bash
docker compose up -d --build
docker compose ps
```

| Servico      | Funcao                                                                                                    | Acesso                  |
| ------------ | --------------------------------------------------------------------------------------------------------- | ----------------------- |
| `frontend`   | Site servido pelo Nginx a partir do `Dockerfile`; encaminha `/api` para o backend.                        | `http://localhost:8080` |
| `backend`    | API do RedGreen-Back, compilada dentro do container a partir de `BACKEND_PATH` (montado somente leitura). | `http://localhost:3000` |
| `postgres`   | Banco de dados da API.                                                                                    | Interno                 |
| `jenkins`    | Jenkins baixado do Docker Hub (`JENKINS_IMAGE`), configurado por JCasC, que executa o `Jenkinsfile`.      | `http://localhost:8081` |
| `mailpit`    | Servidor SMTP de teste que recebe os e-mails do pipeline.                                                 | `http://localhost:8026` |
| `unit-tests` | Container `redgreen-front-unit-tests` (Node.js 22) usado pelo pipeline para dependencias, lint e Jest.    | Interno                 |
| `e2e-tests`  | Container `redgreen-front-e2e-tests` (imagem do Playwright) usado pelo pipeline para os testes E2E.       | Interno                 |
| `perf-tests` | Lighthouse CI e Playwright (`Dockerfile.performance`); executado sob demanda pelo profile `perf`.         | Interno                 |

O `frontend` aguarda o `backend` ficar saudavel, e o `backend` aguarda o `postgres`. Os servicos de aplicacao usam a rede `app`; `jenkins` e `mailpit` usam a rede `ci`. O Jenkins controla o Docker do host pelo socket `/var/run/docker.sock` e executa os comandos de teste com `docker exec` nos containers `redgreen-front-unit-tests` e `redgreen-front-e2e-tests`, que compartilham o workspace pelo volume `jenkins_home`.

Volumes:

- `postgres_data`: dados do banco.
- `jenkins_home`: configuracao, jobs, historico e workspace do Jenkins.
- `mailpit_data`: e-mails recebidos pelo Mailpit.
- `reports`: relatorios do teste de performance.
- `backend_node_modules`: dependencias instaladas do backend.

O servico `jenkins` sempre baixa a imagem publicada no Docker Hub (`JENKINS_IMAGE`, por padrao `phandradd/redgreen-front-jenkins:latest`), entao o pipeline roda na mesma imagem que ele publica. Se a imagem ainda nao existir no Docker Hub, use uma unica vez o override de bootstrap, que constroi o Jenkins localmente a partir de `docker/Dockerfile.jenkins`:

```bash
docker compose -f docker-compose.yml -f docker-compose.bootstrap.yml up -d --build
```

Depois da primeira publicacao, volte ao Compose normal com `docker compose pull jenkins` e `docker compose up -d`.

Para executar o pipeline, acesse o Jenkins com o usuario do `.env` e crie o job em **New Item** -> **Pipeline** -> **Pipeline script from SCM**, com o repositorio Git deste projeto, a branch `*/main` e o Script Path `Jenkinsfile`. O job e a unica configuracao feita pela interface; usuario, URL e credenciais sao definidos por `jenkins/casc.yaml`.

Teste de performance contra o `frontend` do Compose:

```bash
docker compose --profile perf run --rm perf-tests
```

Os relatorios ficam no volume `reports`, em `/reports/performance/<timestamp>`.

Para parar o ambiente, use `docker compose down`, que preserva os volumes. O comando `docker compose down -v` remove tambem os volumes, apagando banco, Jenkins e e-mails.

### Containers Frontend e Performance (Docker)

Alternativa ao Compose para executar apenas os containers do frontend e de performance. A porta `8081` usada abaixo e a mesma do Jenkins no Compose; nao execute os dois fluxos ao mesmo tempo.

Execute na raiz do repositorio com Docker em modo Linux. O frontend usa Nginx e
publica o site em `http://localhost:8081`; o job de performance usa Lighthouse e
Playwright, grava os relatorios e encerra. Este fluxo e independente dos E2E e do
pipeline existentes.

Construa as duas imagens:

```bash
docker build --build-arg VITE_API_BASE_URL=/api -t redgreen-frontend:local .
docker build -f Dockerfile.performance -t redgreen-performance:local .
```

Antes do cadastro, confira `docker ps -a --filter name=redgreen-` e
`docker network ls`. Crie a rede e o frontend **somente se ainda nao existirem**:

```bash
docker network create redgreen-network
docker run -d --name redgreen-frontend --network redgreen-network -p 127.0.0.1:8081:8080 -e API_UPSTREAM=http://backend:3000 redgreen-frontend:local
```

O frontend incorpora `/api` no build. O Nginx remove esse prefixo e encaminha a
requisicao para `API_UPSTREAM`, configurado no runtime. Para a integracao real,
a API deve estar acessivel na mesma rede pelo nome `backend`, porta 3000, ou a
origem deve ser ajustada no cadastro do frontend. Sem API, o site e `/healthz`
continuam disponiveis, mas as chamadas `/api/` retornam erro de upstream.

Cadastre o job **uma unica vez**. Exemplo PowerShell, com relatorios pessoais em
`auditoria/`; mantenha `/auditoria/` em `.git/info/exclude` no seu clone:

```powershell
$reports = Join-Path (Get-Location) 'auditoria\S07-NP2\performance-baseline'
New-Item -ItemType Directory -Force -Path $reports | Out-Null
docker create --init --name redgreen-performance --network redgreen-network --shm-size=1g --cpus=2 --memory=2g -e PERF_BASE_URL=http://redgreen-frontend:8080 --mount "type=bind,source=$reports,target=/reports" redgreen-performance:local
```

Nas proximas execucoes, reutilize os containers cadastrados:

```bash
docker start redgreen-frontend
docker inspect --format '{{.State.Health.Status}}' redgreen-frontend
docker start -a redgreen-performance
docker inspect --format '{{.State.Status}}|ExitCode={{.State.ExitCode}}' redgreen-performance
```

O frontend deve ficar `healthy`; `/healthz` retorna `ok` e as rotas React usam
fallback da SPA. O job de performance permanece cadastrado em `exited`; interprete
seu ExitCode somente depois desse estado: 0 indica coleta concluida com as
limitacoes da baseline, e valor diferente de 0 indica falha. Nao use `--rm` nem
reinicio automatico para esse job. Cada execucao cria uma subpasta com timestamp
no diretorio de relatorios, incluindo `summary.json`, `index.html` e os resultados
Lighthouse/Playwright. O bind mount precisa existir no host do Docker.

`PERF_RUNS` e `PERF_BROWSER_RUNS` usam cinco amostras por padrao. A coleta publica
usa fontes fallback e WebGL headless; nao valida autenticacao, partidas reais,
cobertura de codigo ou metas de performance. Essas integracoes dependem da API e
de fixtures autorizadas. O teste sintetico `performance/proxy-contract.mjs` e
separado da baseline e exige uma rede de validacao sem API real com alias
`backend`; nao o execute na rede de uma API existente.

## 7. Variaveis de Ambiente

Variaveis identificadas no codigo e na configuracao dos testes:

| Variavel             |                     Obrigatoria | Padrao                                     | Uso                                                                                                       |
| -------------------- | ------------------------------: | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`  |                     Em producao | `http://localhost:3000` em desenvolvimento | Define a URL base usada pelo Axios em `apiClient`.                                                        |
| `E2E_BASE_URL`       |                             Nao | `http://localhost:5173`                    | Endereco do frontend acessado pelo Playwright. Quando definida, o Playwright nao inicia o servidor local. |
| `E2E_ADMIN_EMAIL`    | Para cenarios com administrador | `admin@admin.com` no `.env.example`        | E-mail do administrador criado pelo seed do RedGreen-Back.                                                |
| `E2E_ADMIN_PASSWORD` | Para cenarios com administrador | `admin123` no `.env.example`               | Senha do administrador criado pelo seed do RedGreen-Back.                                                 |
| `CI`                 |                     No pipeline | Definida pelo pipeline do Jenkins          | Ativa as configuracoes de CI do Playwright e desabilita a instalacao de navegadores no `postinstall`.     |

A configuracao esta em `src/config.ts`, que remove espacos da URL e usa o fallback local em desenvolvimento. Em producao, a ausencia de `VITE_API_BASE_URL` provoca um erro ao carregar a aplicacao; configure a variavel antes do build.

O arquivo `src/infrastructure/env.ts` tambem permite registrar e ler variaveis de ambiente em runtime por meio de `globalThis.__REDGREEN_VITE_ENV__`, mas o uso direto identificado ocorre em `src/main.tsx` com `setRuntimeEnv(import.meta.env)`.

Exemplo de `.env` para o desenvolvimento local:

```env
VITE_API_BASE_URL=http://localhost:3000
E2E_ADMIN_EMAIL=admin@admin.com
E2E_ADMIN_PASSWORD=admin123
```

O `.env.example` contem essas variaveis e tambem as do Docker Compose e do Jenkins, descritas abaixo. O Playwright carrega `.env` e `.env.local` com `loadEnv` do Vite e preserva variaveis ja definidas no processo. Sem `E2E_BASE_URL`, o Playwright inicia o frontend na porta `5173`; com ela definida, usa o endereco informado sem iniciar servidor. As credenciais de teste nao devem receber o prefixo `VITE_`, usado para expor variaveis ao frontend. O arquivo `.env` esta ignorado pelo Git.

### Variaveis do Docker Compose e do Jenkins

| Variavel                                                                |   Obrigatoria | Uso                                                                                                                                                                          |
| ----------------------------------------------------------------------- | ------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `JENKINS_ADMIN_USER`, `JENKINS_ADMIN_PASSWORD`                          |           Sim | Usuario administrador criado pelo JCasC.                                                                                                                                     |
| `JENKINS_PORT`, `JENKINS_PUBLIC_URL`                                    |           Nao | Porta e URL publica do Jenkins (padrao `8081`).                                                                                                                              |
| `DOCKER_SOCKET_GID`                                                     |           Nao | GID do dono de `/var/run/docker.sock` no host; `0` no Docker Desktop.                                                                                                        |
| `API_UPSTREAM`                                                          |           Nao | API usada pelo frontend criado no estagio E2E do pipeline. Vazia, segue `BACKEND_PORT` (`http://host.docker.internal:<BACKEND_PORT>`); defina apenas para usar outra origem. |
| `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`                                 | Para publicar | Usuario e access token do Docker Hub usados pelo Jenkins oficial para publicar a imagem. Nunca compartilhe o token.                                                          |
| `JENKINS_IMAGE_REPO`                                                    | Para publicar | Repositorio onde o pipeline publica a imagem do Jenkins (padrao `phandradd/redgreen-front-jenkins`).                                                                         |
| `JENKINS_IMAGE`                                                         |           Nao | Imagem e tag que o Compose baixa para iniciar o Jenkins (padrao `phandradd/redgreen-front-jenkins:latest`).                                                                  |
| `EMAIL_TO`, `EMAIL_FROM`                                                |    `EMAIL_TO` | Destinatarios e remetente do e-mail enviado ao final do pipeline.                                                                                                            |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_STARTTLS` |           Nao | Servidor de e-mail; por padrao, o Mailpit do Compose.                                                                                                                        |
| `MAILPIT_UI_PORT`                                                       |           Nao | Porta da interface do Mailpit (padrao `8026`).                                                                                                                               |
| `FRONT_TAG`, `FRONT_PORT`, `BACKEND_PORT`                               |           Nao | Tag da imagem do frontend e portas publicadas do site (`8080`) e da API (`3000`).                                                                                            |
| `BACKEND_PATH`                                                          |           Nao | Caminho do repositorio RedGreen-Back (padrao `../RedGreen-Back`).                                                                                                            |
| `JWT_SECRET`                                                            |           Sim | Segredo usado pelo backend para assinar os tokens.                                                                                                                           |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`                     |           Nao | Credenciais e nome do banco (padrao `postgres`/`postgres`/`redgreen`).                                                                                                       |

## 8. Rotas da Aplicacao

Rotas centralizadas em `src/paths.ts` e renderizadas em `src/routes.tsx`:

| Rota                  | Componente                        | Status identificado |
| --------------------- | --------------------------------- | ------------------- |
| `/`                   | `Home`                            | Implementada        |
| `/login`              | `Login` dentro de `GuestRoute`    | Implementada        |
| `/register`           | `Register` dentro de `GuestRoute` | Placeholder         |
| `/dashboard`          | `Dashboard`                       | Placeholder         |
| `/slot-machine-room`  | `SlotMachineRoom`                 | Implementada        |
| `/slotmachine-tables` | `SlotMachineTablesRoom`           | Implementada        |
| `/gambit-room`        | `GambitRoom`                      | Implementada        |
| `/gambit-tables`      | `GambitTablesRoom`                | Implementada        |
| `/roulette-room`      | `RouletteRoom`                    | Placeholder         |

Protecoes de rota identificadas:

- `GuestRoute` redireciona usuarios com token para `/`, impedindo acesso a telas de visitante como `/login` e `/register`.
- Nao foi identificado um guard dedicado para proteger rotas de jogo ou rotas administrativas no roteamento. O bloqueio de acesso aparece implementado principalmente na UI, com base em token, saldo de fichas e perfil de administrador.

## 9. Integracao com API

A integracao HTTP usa uma instancia centralizada de Axios em `src/infrastructure/http/client.ts`:

- `baseURL`: `config.apiBaseUrl`.
- `timeout`: `10000` ms.
- Interceptor de request adiciona `Authorization: Bearer <token>` quando existe cookie `token`.
- Interceptor de response remove o token e dispara o evento `session-expired` quando recebe `401` e havia token armazenado.

Endpoints identificados no codigo:

### Autenticacao e usuario

| Metodo   | Endpoint            | Uso no frontend                                                     |
| -------- | ------------------- | ------------------------------------------------------------------- |
| `GET`    | `/auth/check-email` | Verifica se o e-mail ja existe para decidir entre login e cadastro. |
| `POST`   | `/auth/login`       | Autentica usuario e valida senha atual na edicao de perfil.         |
| `POST`   | `/auth/register`    | Cadastra novo usuario.                                              |
| `GET`    | `/auth/rank`        | Consulta ranking de jogadores.                                      |
| `GET`    | `/user/profile`     | Consulta dados do perfil e estado do bonus diario.                  |
| `GET`    | `/user/chips`       | Consulta saldo de fichas.                                           |
| `PATCH`  | `/user`             | Atualiza nome, data de nascimento e senha.                          |
| `DELETE` | `/user`             | Exclui conta do usuario.                                            |
| `POST`   | `/user/daily-login` | Resgata bonus diario.                                               |

### Slot Machine

| Metodo   | Endpoint                                          | Uso no frontend                                      |
| -------- | ------------------------------------------------- | ---------------------------------------------------- |
| `GET`    | `/slot/machine`                                   | Lista mesas de Slot Machine.                         |
| `POST`   | `/slot/machine`                                   | Cria mesa de Slot Machine.                           |
| `PUT`    | `/slot/machine/:id`                               | Atualiza mesa de Slot Machine.                       |
| `PATCH`  | `/slot/machine/:id/deactivate`                    | Alterna status ativo/inativo da mesa.                |
| `DELETE` | `/slot/machine/:id`                               | Remove mesa inativa.                                 |
| `GET`    | `/slot-machines/:id/sessions`                     | Consulta sessoes da mesa antes de desativar.         |
| `POST`   | `/slot-machines/:id/sessions`                     | Cria sessao de Slot Machine.                         |
| `POST`   | `/slot-machines/:id/sessions/:sessionId/cash-out` | Encerra sessoes ativas antes da desativacao da mesa. |
| `GET`    | `/sessions/active`                                | Consulta sessao ativa de Slot Machine.               |
| `POST`   | `/sessions/active/reroll/:reelIndex`              | Executa reroll em um reel.                           |
| `POST`   | `/sessions/active/cash-out`                       | Encerra a sessao ativa da Slot Machine.              |

### Gambit

O gerenciamento administrativo tambem usa `POST /admin/gambit-tables/:id/deactivate` para desativar mesas e `PATCH /admin/gambit-tables/:id/activate` para reativa-las.

| Metodo   | Endpoint                                 | Uso no frontend                                           |
| -------- | ---------------------------------------- | --------------------------------------------------------- |
| `GET`    | `/gambit-table`                          | Lista mesas de Gambit.                                    |
| `GET`    | `/gambit-table/:id`                      | Busca mesa de Gambit por id.                              |
| `POST`   | `/gambit-table`                          | Cria mesa de Gambit.                                      |
| `PATCH`  | `/gambit-table/:id`                      | Atualiza mesa de Gambit.                                  |
| `DELETE` | `/gambit-table/:id`                      | Remove mesa de Gambit.                                    |
| `GET`    | `/gambit/sessions/active`                | Consulta sessao ativa de Gambit.                          |
| `POST`   | `/gambit-tables/:id/sessions`            | Cria sessao de Gambit com quantidade de cartas compradas. |
| `POST`   | `/gambit/sessions/active/burn/:position` | Queima carta na posicao informada.                        |
| `POST`   | `/gambit/sessions/active/resolve-event`  | Resolve evento pendente com `GoodIndex` e `BadIndex`.     |
| `POST`   | `/gambit/sessions/active/resolve-effect` | Resolve efeito pendente com lista de `Positions`.         |
| `POST`   | `/gambit/sessions/active/cash-out`       | Encerra sessao ativa de Gambit.                           |

## 10. Gerenciamento de Estado

Estratégias identificadas:

- **Estado local com `useState`:** usado em paginas, modais, controles visuais, fluxo de login, salas de jogo e paineis.
- **Efeitos com `useEffect`:** usados para carregamento inicial, sincronizacao de dados, eventos globais, timers e ciclo de vida de elementos PixiJS.
- **Cache remoto com SWR:** usado em `useUserProfile`, `useUserChips`, `useRanking` e `UseDailyLogin`.
- **Configuracao global do SWR:** definida em `AppProviders`, com `revalidateOnFocus: false` e `dedupingInterval` baseado em `config.cacheTime`.
- **Mutacoes de cache:** usadas para atualizar saldo de fichas e ranking apos apostas, cash-out e bonus diario.
- **Cookies:** `src/infrastructure/Cookies.ts` gerencia `token` e `session_active`.
- **sessionStorage:** `SlotMachineRoom` usa `hudActive` para manter o HUD ativo durante a sala da Slot Machine.
- **Eventos globais:** `session-expired` e emitido pelo interceptor Axios e consumido por `SessionExpiredListener`.

Nao foi identificado uso de Redux, Zustand, Context API customizada ou outro gerenciador global alem do SWR e dos estados locais React.

## 11. Sistema de Formularios

Formularios e entradas identificadas:

- Login e cadastro em `Login.tsx`.
- Edicao de perfil em `EditProfileModal.tsx`.
- Exclusao de conta em `DeleteAccountModal.tsx`.
- Criacao e edicao de mesas de Slot Machine.
- Criacao e edicao de mesas de Gambit.
- Painel de aposta do Gambit com selecao de quantidade de cartas.

Validacoes implementadas:

- E-mail obrigatorio e formato basico por regex.
- Senha obrigatoria, confirmacao de senha e tamanho minimo de 8 caracteres.
- Nome e nickname obrigatorios no cadastro.
- Data de nascimento em formato `DD/MM/YYYY`, validada por `src/validators.ts`.
- Valores numericos inteiros para mesas.
- Limites para mesa Gambit, como maximo de 25 cartas e minimo menor que maximo.
- Campos obrigatorios e mensagens de erro em modais.

Observacao importante:

- Apesar das dependencias `react-hook-form`, `@hookform/resolvers` e `zod`, nao foi identificado uso de `useForm`, `zodResolver` ou schemas Zod nos formularios atuais.
- `src/domain/schemas.ts` contem `userSchema` e `walletSchema`, mas eles nao aparecem conectados aos fluxos de UI analisados.

## 12. Sistema de Jogos

O sistema de jogos existe e esta implementado em `src/presentation/games`.

### Slot Machine

Arquivos principais:

- `src/presentation/games/SlotMachine.tsx`
- `src/presentation/games/SlotMachineGame/SlotMachinePixi.tsx`
- `src/presentation/games/SlotMachineGame/SlotMachineReels.tsx`
- `src/presentation/games/SlotMachineGame/SlotMachineApi.ts`
- `src/presentation/games/SlotMachineGame/SlotMachineLever.tsx`
- `src/presentation/games/SlotMachineGame/SlotMachineButtons.tsx`
- `src/presentation/games/SlotMachineGame/SlotMachineCounters.tsx`

Comportamentos identificados:

- Entrada visual com aproximacao da maquina.
- Animacao do sprite da maquina apos entrada.
- Renderizacao dos rolos com PixiJS.
- Carregamento de texturas dos simbolos.
- Criacao de sessao no backend.
- Adaptacao do resultado recebido da API para animacao visual.
- Reroll por reel.
- Cash-out para voltar ao estado idle.
- Restauracao de sessao ativa.
- Bloqueio de inputs durante animacoes e chamadas pendentes.

### Gambit

Arquivos principais:

- `src/presentation/games/Gambit.tsx`
- `src/presentation/games/GambitGame/GambitApi.ts`
- `src/presentation/games/GambitGame/GambitBoard.tsx`
- `src/presentation/games/GambitGame/GambitCard.tsx`
- `src/presentation/games/GambitGame/GambitMapper.ts`
- `src/presentation/games/GambitGame/GambitEventTable.tsx`
- `src/presentation/games/cardReward/`

Comportamentos identificados:

- Criacao de sessao com quantidade de cartas compradas.
- Tabuleiro visual com cartas reveladas e nao reveladas.
- Queima de cartas por endpoint ativo.
- Resolucao de eventos com escolhas boas e ruins.
- Resolucao de efeitos com selecao de posicoes.
- Efeitos especiais mapeados para assets visuais.
- Modal de escolha de recompensas.
- Feedback visual de pontuacao.
- Cash-out automatico quando o backend marca a sessao como finalizada.

### Roleta

A rota `/roulette-room` existe, mas a implementacao atual e apenas um placeholder textual. Nao foi identificado sistema de roleta implementado no codigo.

## 13. Interface e UX

Caracteristicas visuais identificadas:

- Estetica de cassino com pixel art.
- Variaveis CSS globais para cores, sombras e fontes.
- Fonte importada do Google Fonts em `src/index.css`.
- Padrao visual com bordas pixeladas, sombras duras e elementos em vermelho, verde e dourado.
- Animações com Framer Motion em paginas, modais, cards, ranking e paineis.
- Icones com `lucide-react` em HUD, ranking e bonus diario.
- Feedbacks por modais e toasts.
- Estados de carregamento, erro, bloqueio e vazio em paineis e listagens.
- Overlays visuais para mesas bloqueadas, inativas ou indisponiveis.

## 14. Testes Automatizados

O projeto possui duas suites independentes: Jest para testes unitarios e de integracao de componentes, e Playwright para fluxos executados em navegadores. `npm test` executa apenas Jest; `e2e/` esta excluido em `jest.config.js`.

### Testes com Jest

Configuracao:

- Framework: Jest.
- Ambiente: `jsdom`.
- Transformacao TypeScript: `ts-jest`.
- Setup: `src/setupTests.ts` com `@testing-library/jest-dom`.
- Mapeamento de aliases configurado em `jest.config.js`.

Foram identificados **35 arquivos de teste** em `test/`.

Areas cobertas:

- Login, autenticacao e conta excluida.
- Home, logout, ranking, bonus diario, edicao de perfil e exclusao de conta.
- `GuestRoute`.
- Ranking e `RankingPanel`.
- Validador de data de nascimento.
- Hooks de saldo de fichas, perfil e bonus diario (progresso de 7 dias, sequencia e resgate).
- Schemas Zod de usuario e carteira.
- Modais de resultado e aviso de sessao.
- Criacao e edicao de mesas de Slot Machine.
- Criacao de mesas de Gambit.
- Cards de mesas de Slot e Gambit.
- Cores de mesa.
- API, tabela de premios, simbolos e fluxo visual da Slot Machine.
- Entrada/aproximacao da Slot Machine.
- Fluxo de jogo da Slot Machine com sessao ativa, reroll, cash-out e bloqueio de input.
- API, mapeadores e validacao do contrato, cartas, efeitos, natureza da revelacao, tema da mesa, auto cash-out, sala e fluxo de jogo do Gambit.
- Controller de recompensa por cartas.

### Cobertura da regra de negocio

A cobertura e medida apenas sobre a regra de negocio, conforme o criterio da disciplina, com limite minimo de **90%** em comandos, ramificacoes, funcoes e linhas (`coverageThreshold` em `jest.config.js`). Abaixo disso, `npm test -- --coverage` falha, e o estagio de testes unitarios do Jenkins tambem.

| Entra na metrica                                                    | Fica fora                                                   |
| ------------------------------------------------------------------- | ----------------------------------------------------------- |
| `src/application/` (hooks de saldo, perfil, ranking e bonus diario) | Paginas, componentes de UI e modais                         |
| `src/domain/` e `src/validators.ts`                                 | Componentes PixiJS, texturas e animacoes                    |
| API, mapeador, efeitos, revelacao, mesa e auto cash-out do Gambit   | `src/infrastructure/` (cliente HTTP, cookies e env)         |
| API, configuracao de simbolos e tabela de premios da Slot Machine   | `useCardRewardController` e `RewardCardSelection` (sem uso) |

`useCardRewardController` e `RewardCardSelection` ficam fora porque nenhuma tela os utiliza: o Gambit monta a escolha de cartas pelo `GambitPendingEventRewardAdapter`, a partir do `PendingEvent` enviado pelo backend. A lista exata de arquivos esta em `collectCoverageFrom`.

Comando:

```bash
npm test
```

Para executar com relatorio de cobertura:

```bash
npm test -- --coverage
```

### Preparacao e execucao

1. Instale as dependencias conforme a secao 6 e configure `.env`.
2. Inicie o backend e seu banco de dados conforme as instrucoes do repositorio da API. O Playwright deste projeto inicia somente o frontend.
3. Para TC-004, TC-005, TC-006, TC-007 e TC-009, configure `E2E_ADMIN_EMAIL` e `E2E_ADMIN_PASSWORD` com uma conta administradora previamente cadastrada. Sem essas variaveis, esses casos sao ignorados.
4. Execute a suite ou selecione um arquivo e navegador pelos comandos abaixo.

```bash
# Todos os cenarios nos tres navegadores
npm run test:e2e

# Apenas Chromium
npm run test:e2e -- --project=chromium

# Um cenario especifico
npm run test:e2e -- e2e/TC-001.spec.ts --project=chromium

# Navegador visivel ou depuracao passo a passo
npm run test:e2e -- e2e/TC-001.spec.ts --project=chromium --headed
npm run test:e2e -- e2e/TC-001.spec.ts --project=chromium --debug

# Interface interativa e relatorio da execucao
npm run test:e2e:ui
npm run test:e2e:report

# Listar os casos sem executar os fluxos
npm run test:e2e -- --list
```

Se os navegadores ainda nao estiverem instalados, execute `npx playwright install`. No pipeline, os navegadores ja vem na imagem `mcr.microsoft.com/playwright` do container `redgreen-front-e2e-tests`.

Configuracoes de execucao:

- Projetos `chromium`, `firefox` e `webkit`, com perfis desktop.
- Tres workers (`workers: 3`), com `fullyParallel: true` habilitado.
- Sem repeticao automatica local; uma nova tentativa em caso de falha no CI.
- `test.only` proibido no CI por `forbidOnly`.
- Sem `E2E_BASE_URL`, inicia `npm run dev -- --port 5173` localmente, ou `npm run build && npm run preview -- --port 5173` com `CI` definida, com tempo limite de 120 segundos para o servidor ficar disponivel.
- Com `E2E_BASE_URL` definida, nao inicia servidor e testa o endereco informado. E o modo usado no pipeline, que testa a imagem do frontend em `http://redgreen-front-app:8080`.

O helper `e2e/helpers/CreateAccount.ts` cadastra e autentica novos jogadores pela interface. Os testes criam dados reais na API: as contas nao possuem limpeza automatica; TC-004, TC-005 e TC-009 removem as mesas no final do fluxo, mas uma falha anterior pode deixar registros. Use uma base destinada a testes.

### Testes de navegador com Playwright

A configuracao esta em `playwright.config.ts`, e os cenarios ficam em `e2e/`. A tabela abaixo documenta os casos **TC-001 a TC-020**, abrangendo fluxos de sucesso (Happy Path) e de erro (Unhappy Path). O TC-006 possui dois testes. Casos sem as credenciais exigidas aparecem como ignorados (`skipped`).

| Arquivo          | Fluxo validado                                                                 | Dependencias e simulacoes                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `TC-001.spec.ts` | Cadastro e login com a mesma conta.                                            | API real; cria usuario com e-mail e nickname baseados no horario.                                                                  |
| `TC-002.spec.ts` | Rejeicao de senha curta e confirmacao divergente.                              | Simula a consulta de e-mail e verifica validacoes da interface.                                                                    |
| `TC-003.spec.ts` | Exibicao de erro para senha incorreta apos cadastro.                           | Cadastro real; consulta de e-mail e resposta de login `401` simuladas.                                                             |
| `TC-004.spec.ts` | Criacao e edicao de mesa de Slot Machine, seguida de desativacao e exclusao.   | API real e conta administradora.                                                                                                   |
| `TC-005.spec.ts` | Criacao e edicao de mesa de Gambit, seguida de desativacao e exclusao.         | API real e conta administradora.                                                                                                   |
| `TC-006.spec.ts` | Bloqueio de troca de mesa com sessao ativa, em Gambit e Slot Machine.          | Login real de administrador; saldo, mesas e sessoes simulados.                                                                     |
| `TC-007.spec.ts` | Modal de sessao expirada, bloqueio de interacao e retorno ao login.            | Login real de administrador; dispara o evento `session-expired` no navegador.                                                      |
| `TC-008.spec.ts` | Mensagem de conta inativa e permanencia no login.                              | Consulta de e-mail e rejeicao do login simuladas.                                                                                  |
| `TC-009.spec.ts` | Mesa de Slot Machine deixa de aparecer ao jogador apos desativacao.            | API real, administrador e novo jogador; ajusta a resposta real do perfil para evitar o modal de bonus.                             |
| `TC-010.spec.ts` | Edicao de nome e nascimento com senha atual, conferida ao reabrir o perfil.    | API real e novo usuario; ajusta a resposta real do perfil para evitar o modal de bonus.                                            |
| `TC-011.spec.ts` | Sessao de Slot Machine com bonus diario, giro, rerolls e cash-out.             | API real, novo usuario, bonus disponivel e mesa Slot 1.                                                                            |
| `TC-012.spec.ts` | Revelacao de carta de efeito no Gambit e exibicao do efeito atual.             | API real, novo usuario e mesa High Stakes Gambit; interacao com cartas no canvas.                                                  |
| `TC-013.spec.ts` | Escolha de cartas nas etapas de um evento especial do Gambit.                  | API real e novo usuario; depende de encontrar um evento durante a partida.                                                         |
| `TC-014.spec.ts` | Restauracao da sessao de Slot Machine ao sair e retornar, seguida de cash-out. | API real e novo usuario; desabilita cache HTTP para conferir a sessao persistida.                                                  |
| `TC-015.spec.ts` | Restauracao da sessao de Gambit e continuidade ate o cash-out.                 | API real e novo usuario; desabilita cache HTTP e confere cartas, pontos e efeitos persistidos.                                     |
| `TC-016.spec.ts` | Rejeicao de data de nascimento impossivel na edicao de perfil.                 | Cadastro e login reais; verifica validacao local e ausencia de requisicoes de gravacao.                                            |
| `TC-017.spec.ts` | Rejeicao de cadastro com nickname ja utilizado.                                | API real; cria uma conta e tenta cadastrar outra com o mesmo nickname.                                                             |
| `TC-018.spec.ts` | Bloqueio dos controles da Slot Machine para visitante nao autenticado.         | API real, sem login; confere resposta 401 e ausencia de requisicoes de jogo.                                                       |
| `TC-019.spec.ts` | Troca de senha, rejeicao da senha antiga e login com a nova.                   | API real e novo usuario; atualizacao de perfil e autenticacao sem respostas simuladas.                                             |
| `TC-020.spec.ts` | Bloqueio de mesas e rejeicao de giro por saldo insuficiente.                   | API real; solicita cadastro com 5 fichas e usa mesas Slot 0 a Slot 3. A mesa de entrada pode ser definida por E2E_FREE_SLOT_TABLE. |

Os testes combinam integracao real e interceptacoes com `page.route`. As simulacoes verificam a resposta da interface a estados controlados, sem comprovar a regra correspondente no backend. No TC-007, por exemplo, o evento e disparado diretamente, sem provocar um `401` real.

### Relatorios e evidencias

- Resultado textual no terminal com o reporter `list`.
- Relatorio HTML em `playwright-report/`, aberto com `npm run test:e2e:report`.
- Resultado estruturado em `playwright-report/results.json`.
- Videos habilitados para todas as execucoes e screenshots automaticos em falhas.
- Trace na primeira repeticao (`on-first-retry`). Como localmente nao ha retries, use `--retries=1` para obter esse trace se o teste falhar e for repetido.
- Screenshots das etapas capturados por `e2e/helpers/CaptureScreenshot.ts`, salvos no diretorio de saida do teste e anexados ao relatorio, inclusive em cenarios aprovados.

Os arquivos de execucao ficam em `test-results/`. Esse diretorio e `playwright-report/` estao ignorados pelo Git. As capturas sao evidencias dos passos; a suite nao configura comparacao visual de screenshots com imagens de referencia.

Se um caso aparecer como `skipped`, confira as credenciais exigidas. Para erros de conexao, verifique separadamente a URL do frontend (`E2E_BASE_URL`) e a URL da API (`VITE_API_BASE_URL`). Para falhas de uma etapa, consulte a mensagem de assercao e os anexos no relatorio HTML.

## 15. Qualidade de Codigo

Ferramentas configuradas:

- **ESLint:** `eslint.config.js`, com regras recomendadas de JavaScript, TypeScript, React Hooks e React Refresh.
- **Prettier:** `.prettierrc`, com ponto e virgula, aspas simples, largura de 80 colunas e trailing comma `es5`.
- **Husky:** hook `commit-msg`.
- **Commitlint:** configurado com `@commitlint/config-conventional`.
- **lint-staged:** executa `eslint --fix` e `prettier --write` em arquivos `ts` e `tsx`.

Observacao: a configuracao de `lint-staged` existe em `package.json`, mas nao ha hook `pre-commit` versionado que a execute automaticamente. O hook identificado e `commit-msg`.

Tipos de commit aceitos pelo Commitlint:

- `ci`
- `test`
- `chore`
- `docs`
- `feat`
- `fix`
- `hotfix`
- `perf`
- `refactor`
- `revert`
- `style`

Os scripts de lint, formatacao e testes estao documentados na secao [6. Instalacao e Execucao](#6-instalacao-e-execucao). Os comandos `lint` e `format` alteram arquivos; `lint:check` e `format:check` apenas verificam e sao usados no CI.

## 16. Pipeline CI/CD

O pipeline e definido no `Jenkinsfile` e executado por um **Jenkins em container**, o servico `jenkins` do Docker Compose. A imagem (`docker/Dockerfile.jenkins`) inclui Docker CLI, Python 3 e os plugins de `jenkins/plugins.txt`; usuario administrador, URL e credenciais sao configurados por JCasC (`jenkins/casc.yaml`) a partir do `.env`. O GitHub Actions nao e mais utilizado.

Os comandos de Node.js e Playwright rodam nos containers `redgreen-front-unit-tests` e `redgreen-front-e2e-tests`, chamados com `docker exec` no workspace do Jenkins, compartilhado pelo volume `jenkins_home`.

1. `Prepare`: define a tag `<build>-<commit>` da imagem e limpa relatorios e pacotes de builds anteriores.
2. `Install Dependencies`: executa `npm ci --legacy-peer-deps` no container de testes unitarios.
3. `Quality`: executa `Lint` (`npm run lint:check`) e `Format` (`npm run format:check`) em paralelo.
4. `Unit Tests`: executa a suite Jest com cobertura, gravando os resultados em `reports/unit/`. O estagio falha se a cobertura da regra de negocio ficar abaixo de 90% (ver [Cobertura da regra de negocio](#cobertura-da-regra-de-negocio)).
5. `Build & Package`: constroi a imagem do `Dockerfile`, extrai o `dist/` e gera o pacote `redgreen-front-<tag>.tar.gz`.
6. `E2E Tests`: sobe a imagem gerada em uma rede temporaria como `redgreen-front-app`, conecta o container de E2E, executa `xvfb-run -a npx playwright test` e gera o site do relatorio com `npm run report:site`.
7. `Build & Publish Jenkins Image`: na `main`, ou com o parametro `PUBLISH_IMAGE`, constroi a imagem do Jenkins a partir de `docker/Dockerfile.jenkins` e a publica em `JENKINS_IMAGE_REPO` com a tag do build e, na `main`, tambem como `latest`. A imagem do site gerada no `Build & Package` e usada apenas no pacote e nos testes E2E.
8. `Verify Jenkins Image from Docker Hub`: remove a copia local, baixa do Docker Hub a tag recem-publicada, inicia um Jenkins isolado (`--network none`) com usuario temporario e aguarda o `/login` responder, comprovando que a imagem publicada funciona.

Ao final de toda execucao (`post`), o pipeline remove os containers, a rede e as imagens temporarios, arquiva `reports/`, `playwright-report/`, `test-results/` e `_site/`, alem do pacote `.tar.gz` em caso de sucesso, e envia um e-mail com o resultado por `scripts/send-pipeline-email.py`, usando `EMAIL_TO` e o SMTP configurado (por padrao, o Mailpit). O e-mail e obrigatorio: se o envio falhar, o build e marcado como falho.

### Jenkins oficial e credenciais do Docker Hub

O Jenkins oficial do grupo, responsavel por publicar a imagem, e o que possui `DOCKERHUB_USERNAME` e `DOCKERHUB_TOKEN` da conta dona de `JENKINS_IMAGE_REPO`. Nos builds da `main`, as etapas de publicacao e verificacao sempre executam; sem essas credenciais, o `docker login` falha e o build e marcado como falho. Esse comportamento e intencional: no Jenkins oficial, a falta de credencial precisa aparecer como erro, e nao ser ignorada.

Quem executa o pipeline em outra maquina sem as credenciais vera todas as etapas anteriores executarem normalmente e a falha apenas na publicacao. Para validar uma alteracao sem publicar, execute o job a partir de uma branch diferente da `main`, onde a publicacao so ocorre com `PUBLISH_IMAGE` marcado. O token nunca deve ser compartilhado entre os integrantes.

### Imagem no Docker Hub

A imagem do Jenkins do pipeline esta publicada em **[phandradd/redgreen-front-jenkins](https://hub.docker.com/r/phandradd/redgreen-front-jenkins)**. Ela contem o Jenkins, o Docker CLI, o Python 3, os plugins de `jenkins/plugins.txt` e o `jenkins/casc.yaml`; nenhum segredo faz parte da imagem, pois usuario, senha e credenciais sao lidos do `.env` quando o container inicia.

Para baixar e executar a imagem publicada, com o `.env` preenchido conforme a secao [7. Variaveis de Ambiente](#7-variaveis-de-ambiente):

```bash
docker pull phandradd/redgreen-front-jenkins:latest
docker run -d --name redgreen-front-jenkins -p 127.0.0.1:8081:8080 --group-add 0 -v redgreen_front_jenkins_home:/var/jenkins_home -v /var/run/docker.sock:/var/run/docker.sock --env-file .env phandradd/redgreen-front-jenkins:latest
```

O Jenkins fica disponivel em `http://localhost:8081`, com o usuario de `JENKINS_ADMIN_USER`. Para executar o pipeline completo, com os containers de teste, o backend e o Mailpit, use o Docker Compose descrito em [Execucao com Docker Compose](#execucao-com-docker-compose).

Configuracoes identificadas:

- Tempo limite de 30 minutos, historico de 5 builds e execucoes concorrentes desabilitadas.
- Job do tipo Pipeline criado pela interface (Pipeline script from SCM); a `main` e identificada por `GIT_BRANCH == 'origin/main'`.
- Credenciais `smtp-password`, `e2e-admin-password` e `dockerhub` criadas pelo JCasC.
- O frontend do estagio E2E acessa a API por `API_UPSTREAM`, que por padrao acompanha a porta publicada do backend no Compose (`http://host.docker.internal:<BACKEND_PORT>`). Ao mudar `BACKEND_PORT`, o pipeline passa a usar a nova porta sem outro ajuste.

Lacunas identificadas:

- Alguns cenarios E2E de jogo sao instaveis e podem falhar o estagio, impedindo a publicacao no Docker Hub.
- A imagem e publicada na conta pessoal `phandradd`; uma organizacao no Docker Hub tornaria a publicacao independente de um integrante.
- Os relatorios nao sao mais publicados no GitHub Pages; ficam nos artefatos de cada build do Jenkins.
- O teste de performance (`perf-tests`) nao faz parte do pipeline e e executado manualmente.
- `host.docker.internal` esta disponivel no Docker Desktop; em hosts Linux sem esse nome, `API_UPSTREAM` precisa ser ajustada.

## 17. Decisoes Tecnicas

Decisoes identificadas no codigo:

- Uso de Vite para ambiente de desenvolvimento rapido e build.
- Uso de TypeScript com configuracao `strict`.
- Centralizacao de paths em `src/paths.ts`.
- Centralizacao de API em `apiClient` com interceptors de autenticacao e sessao expirada.
- Uso de SWR para dados remotos com cache, deduplicacao e mutacao manual.
- Persistencia do token em cookies com `SameSite=Strict` e `Secure`.
- Separacao entre paginas, componentes de UI e componentes de jogo.
- Uso de PixiJS diretamente em componentes de jogo para renderizacao e animacao visual.
- Resultado dos jogos orientado por payloads do backend, com o frontend adaptando os dados para animacoes.
- Uso de Framer Motion para transicoes e feedback visual.
- Uso de testes unitarios e de integracao de componentes para fluxos criticos.
- Uso de Playwright em tres navegadores, com cenarios reais e simulados e evidencias anexadas aos relatorios.
- Imagem do frontend com build multi-stage e Nginx sem root, com proxy reverso `/api` configurado em runtime por `API_UPSTREAM`.
- Orquestracao da aplicacao, do Jenkins e dos containers de teste com Docker Compose, usando volumes para persistencia e para compartilhar o workspace do pipeline.
- Pipeline em Jenkins com configuracao como codigo (JCasC) e segredos armazenados como credenciais.

## 18. Uso de IA

Patrick Augusto Lins de Oliveira Damião
Foi utilizado o Copilot, sempre com o contexto do README explicando a estrutura do projeto (com foco na stack) e apoio do documento com as orientações da tarefa. Durante todas as etapas de desenvolvimento dos testes com o Playwright o processo foi feito a partir de instruções detalhadas de cada etapa (incluindo os momentos onde deveriam ser salvas screenshots), com a maior parte do código sendo gerado diretamente pela IA. A IA ficou responsável apenas por criar o código dos testes, mas a idealização dos testes foi feita por conta própria.
A IA também foi utilizada para desenvolver os testes de performance, tanto na elaboração do que poderia ser testado quanto na criação dos códigos de teste.

Antonio Feliciano da Silveira Neto
Durante o desenvolvimento da suíte de testes, utilizei o Claude (Anthropic) como apoio ao processo de criação dos casos de teste. Usei o Claude no navegador para pensar e estruturar os prompts a partir da minha ideia inicial de cada cenário descrevendo em linguagem natural o fluxo que eu queria testar, as telas envolvidas e o que deveria ser validado e o Claude ajudava a organizar e refinar essa descrição. Com o prompt já mais claro e estruturado, eu o utilizava na extensão do Claude no VSCode para apoiar a implementação do código de automação. A execução, validação e revisão final dos testes foram feitas por mim, com a IA atuando apenas como suporte ao raciocínio e à escrita do código, não como substituta da autoria do trabalho.

Pedro Armengol de Oliveira
Na parte de containerização, utilizei o Claude Code (Anthropic), pela extensão no VSCode, como apoio na construção do `docker-compose.yml`. A IA foi usada para analisar as Pull Requests dos outros integrantes (containers do frontend e de performance, Jenkins e containers de teste), executar a stack completa em ambientes isolados para verificar se os containers funcionavam em conjunto, propor os ajustes no compose para seguir o que foi definido nessas PRs (nomes de containers, portas, variáveis e volumes) e atualizar este README. As decisões sobre aprovar ou pedir alterações nas PRs, os commits, os merges e os testes manuais finais foram feitos por mim, com a IA atuando como suporte na análise, na escrita da configuração e na validação, não como substituta da autoria do trabalho.

## 19. Metodologia de Desenvolvimento

No começo do desenvolvimento do projeto não chegamos a pensar e formalizar uma metodologia específica. Em vez disso, definimos alguns combinados para que o projeto progredisse da melhor maneira possível, adotando, na prática, um fluxo ágil informal e adaptado à realidade do grupo.
Começamos nos dividindo em 3 duplas, em que cada integrante seria responsável por validar e testar as Pull Requests da sua dupla. Cada dupla ficou responsável por um aspecto do projeto: uma com o front na parte de Interface e Integração de Usuário, outra com o front na parte de Motor Gráfico e Animações dos jogos, e a última com o backend — Regras de Negócio e Persistência de Dados.
Definimos também duas reuniões semanais, uma na terça-feira e outra na quinta-feira, cada uma com um intuito diferente. Na reunião de terça-feira, apresentávamos e explicávamos o que fizemos ao decorrer da semana para os outros e já alinhávamos quais seriam as próximas funções que faríamos. Nas de quinta-feira, nos reuníamos para colocar a mão na massa e progredir no projeto.
Nosso principal meio de comunicação foi o Discord, onde fazíamos as reuniões. Além disso, também usamos o WhatsApp para dar feedbacks mais informais e o próprio fluxo das PRs no GitHub, onde já apontávamos mais detalhadamente o que deveria ser mudado.
Vale destacar que não definimos uma Definição de Pronto (DoD) nem uma Definição de Preparado (DoR), e não tivemos sprints propriamente ditas — trabalhamos com uma cadência fixa de reuniões em vez de ciclos formais.

## 20. Dinâmica de Desenvolvimento

As decisões técnicas foram tomadas, em sua maioria, pelas próprias duplas responsáveis por cada camada, já que cada uma tinha o maior contexto sobre o que estava construindo. Ainda assim, o feedback dos demais integrantes era sempre bem-vindo, principalmente no momento da revisão das Pull Requests, onde pontos de melhoria e abordagens alternativas eram discutidos abertamente. No início, as decisões sobre o que implementar foram guiadas por cobrir os requisitos pedidos no laboratório; conforme o projeto avançou, a priorização passou a ser orientada pela próxima funcionalidade que cada dupla precisava para destravar seu trabalho.
Para manter o histórico do repositório limpo e legível, estabelecemos um padrão obrigatório tanto para commits quanto para Pull Requests. Os commits seguiam o formato de tipo e descrição (feat:, fix:, chore:, docs:, test:, refactor:, style:), e as branches seguiam a convenção tipo/escopo-descrição-curta (feat/, bugfix/, hotfix/, chore/). As Pull Requests também seguiam um modelo padronizado, com seções explicando o porquê e o que foi feito, como testar e as evidências de funcionamento. Esse padrão facilitou bastante a visualização do que cada PR entregava e tornou as revisões entre as duplas mais ágeis.
O maior desafio da dinâmica de desenvolvimento veio da criação do Gambit, um jogo completamente original concebido por nós. Por não ser baseado em um jogo já existente, não tínhamos, no início, uma definição clara de como ele deveria funcionar. Muitas regras e mecânicas só foram se consolidando ao longo do desenvolvimento, e novas ideias surgiam à medida que o jogo ganhava forma. Isso gerou atrasos e exigiu diversas alterações e refactors em código que já havia sido escrito, tanto no backend (regras de negócio e persistência) quanto no front (motor gráfico e fluxo de telas). Em vários momentos foi necessário voltar a partes já "prontas" para adaptá-las a uma nova decisão de design.
Esses ajustes também geraram bloqueios pontuais entre as duplas, já que mudanças na lógica do Gambit no backend impactavam diretamente o trabalho das duplas de front, que dependiam dessas definições para avançar. Nesses casos, nos reorganizamos priorizando as implementações que destravavam o trabalho das outras duplas.
A principal lição aprendida foi sobre a importância de definir melhor o escopo e as regras de uma funcionalidade original antes de começar a implementá-la. Boa parte dos refactors do Gambit poderia ter sido evitada com um planejamento inicial mais detalhado das mecânicas do jogo. Também percebemos que a ausência de uma Definição de Pronto (DoD) clara deixou alguns critérios de "terminado" subjetivos, e que adotá-la desde o início teria tornado as entregas mais previsíveis. Em um próximo projeto, investiríamos mais tempo no alinhamento de escopo logo no começo e formalizaríamos esses combinados que, neste projeto, ficaram apenas implícitos.

## 21. Historias de usuario

### História 1: Cadastro de usuário (Prioridade: Alta)

Como visitante, eu quero criar uma conta com e-mail e senha para que eu possa acessar o cassino e receber meu saldo inicial de fichas.

Critérios de aceitação:

- Dado que estou na tela de cadastro, quando preencho e-mail válido e senha forte e confirmo, então minha conta é criada e recebo um saldo inicial de fichas.
- Dado que informo um e-mail já cadastrado, quando submeto, então recebo mensagem de erro e o cadastro não é concluído.
- Dado que a senha não atende às regras de validação, quando submeto, então a validação do formulário bloqueia o envio e exibe o erro antes de chamar a API.

### História 2: Reroll de slot (Prioridade: Alta)

Como jogador do cassino, eu quero selecionar um slot específico para realizar um reroll para que eu possa tentar melhorar minha combinação e aumentar minhas chances de obter uma recompensa maior.

Critérios de aceitação:

- Dado que possuo rerolls disponíveis, quando seleciono um dos slots permitidos, então o sistema destaca visualmente o slot escolhido.
- Dado que um slot foi selecionado, quando confirmo a ação de reroll, então apenas o slot escolhido executa novamente a animação de giro.
- Dado que o reroll foi concluído, quando o backend retorna o novo resultado, então o símbolo exibido no slot corresponde exatamente ao valor recebido.
- Dado que um reroll foi utilizado, quando a operação é concluída, então a quantidade restante de rerolls é atualizada na interface.
- Dado que não possuo mais rerolls disponíveis, quando tento realizar um novo reroll, então o sistema não permite a ação e mantém o estado atual dos slots.

### História 3: Ranking de jogadores (Prioridade: Média)

Como jogador competitivo, eu quero ver um ranking dos jogadores para que eu possa comparar meu desempenho com os demais.

Critérios de aceitação:

- Dado que existem jogadores cadastrados, quando acesso a tela de ranking, então vejo a lista ordenada pelo saldo de fichas.
- Dado que meu saldo é alterado, quando o ranking é recalculado, então minha posição reflete a mudança.

### História 4: Bônus diário (Prioridade: Média)

Como jogador autenticado, eu quero resgatar meu bônus diário de fichas para que eu possa aumentar meu saldo e continuar jogando.

Critérios de aceitação:

- Dado que estou logado e ainda não resgatei o bônus do dia, quando acesso o painel de bônus diário, então vejo o dia atual da sequência e posso resgatar a recompensa.
- Dado que o bônus diário já foi resgatado, quando acesso o painel novamente, então o botão de resgate aparece bloqueado com a informação de que o bônus já foi coletado.
- Dado que o resgate é concluído com sucesso, quando a API retorna a recompensa, então o saldo de fichas é atualizado na interface.

### História 5: Gerenciamento de mesas de jogo (Prioridade: Alta)

Como administrador, eu quero criar, editar, desativar e remover mesas de jogo para que eu possa controlar quais mesas estarão disponíveis aos jogadores.

Critérios de aceitação:

- Dado que estou autenticado como administrador, quando acesso a tela de mesas, então vejo a opção de criar uma nova mesa.
- Dado que informo dados inválidos ao criar ou editar uma mesa, quando tento salvar, então recebo uma mensagem de erro e a operação não é concluída.
- Dado que uma mesa está ativa, quando tento excluí-la, então a exclusão fica bloqueada até que a mesa seja desativada.
- Dado que uma mesa possui sessões ativas, quando tento desativá-la, então o sistema exibe um aviso antes de concluir a operação.

## 22. Conclusao

O RedGreen Frontend apresenta uma aplicacao React com arquitetura organizada em camadas, integracao com API, cache com SWR, interface visual consistente e dois sistemas de jogo implementados. A base de testes cobre diversos fluxos relevantes, especialmente autenticação, ranking, modais, Slot Machine e Gambit.

As principais lacunas identificadas para evolucao academica e tecnica sao a remocao ou conclusao de placeholders, a integracao real de schemas/formularios com as bibliotecas ja instaladas, o aumento da cobertura de testes unitarios, a estabilizacao dos cenarios E2E de jogo e a limpeza de arquivos residuais do template inicial. Jest e Playwright ja possuem etapas no pipeline do Jenkins, executado com o restante do ambiente pelo Docker Compose, e a suite de navegador registra evidencias dos fluxos de autenticacao, administracao de mesas e edicao de perfil.
