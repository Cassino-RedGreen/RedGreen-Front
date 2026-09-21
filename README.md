# RedGreen Frontend

[![CI/CD](https://github.com/Cassino-RedGreen/RedGreen-Front/actions/workflows/ci.yml/badge.svg)](https://github.com/Cassino-RedGreen/RedGreen-Front/actions/workflows/ci.yml)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Relat%C3%B3rios-222222?logo=github)](https://cassino-redgreen.github.io/RedGreen-Front/)

Frontend do projeto **RedGreen**, desenvolvido para a disciplina **C14 - Engenharia de Software**. A aplicacao implementa a interface web de um cassino com autenticação, carteira de fichas, ranking, bonus diario, administracao de mesas e dois jogos principais: **Slot Machine** e **Gambit**.

Este documento foi elaborado a partir da analise do codigo-fonte existente neste repositorio. Funcionalidades, rotas, endpoints e testes descritos aqui correspondem ao que foi identificado no projeto.

## Autores

Projeto desenvolvido pelas equipes de **Backend** (este repositório) e **Frontend** ([RedGreen-Front](https://github.com/Cassino-RedGreen/RedGreen-Front)).

### Backend

| Autor | GitHub |
| ----- | ------ |
| Patrick Augusto Lins de Oliveira Damião | [@Pack0042](https://github.com/Pack0042) |
| Antonio Feliciano | [@AntonioFSN2](https://github.com/AntonioFSN2) |

### Frontend

| Autor | GitHub |
| ----- | ------ |
| Danilo Henrique Maia da Silva | [@DaniloSilva31](https://github.com/DaniloSilva31) |
| Pedro Henrique Andrade | [@phandrad3](https://github.com/phandrad3) |
| Pedro Armengol de Oliveira | [@Armengolz](https://github.com/Armengolz) |
| Pedro R. Nogueira | [@PedroRNogueira](https://github.com/PedroRNogueira) |

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

| Categoria | Ferramentas |
| --------- | ----------- |
| **Core** | React 19, React DOM, TypeScript 5.9 |
| **Build e Desenvolvimento** | Vite 8 |
| **Roteamento** | React Router DOM 6 |
| **Comunicação HTTP e Cache** | Axios, SWR |
| **Estilização e Ícones** | Tailwind CSS, lucide-react |
| **Animações** | Framer Motion |
| **Motor de Jogos** | PixiJS, `@pixi/react` |
| **Formulários e Validação** | React Hook Form, Zod |
| **Testes** | Jest, ts-jest, jsdom, React Testing Library |
| **Testes E2E** | Playwright (Chromium, Firefox e WebKit) |
| **Qualidade e Padronização** | ESLint, Prettier, Husky, Commitlint, lint-staged |
| **CI/CD** | GitHub Actions |

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
|   `-- TC-001.spec.ts ... TC-010.spec.ts
|-- .github/
|   `-- workflows/
|       `-- ci.yml
|-- .husky/
|-- .env.example
|-- eslint.config.js
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

- Node.js 22 atualizado, conforme a versao principal utilizada no GitHub Actions.
- npm.
- Backend em execucao para os fluxos que consomem a API real.

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

Testes:

```bash
npm test
```

Lint:

```bash
npm run lint
```

Formatacao:

```bash
npm run format
```

## 7. Variaveis de Ambiente

Variaveis identificadas no codigo e na configuracao dos testes:

| Variavel             |                     Obrigatoria | Padrao                                     | Uso                                                                                                   |
| -------------------- | ------------------------------: | ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`  |                     Em producao | `http://localhost:3000` em desenvolvimento | Define a URL base usada pelo Axios em `apiClient`.                                                    |
| `E2E_BASE_URL`       |                             Nao | `http://localhost:5173`                    | Endereco do frontend acessado pelo Playwright.                                                        |
| `E2E_ADMIN_EMAIL`    | Para cenarios com administrador | Sem padrao                                 | E-mail de uma conta administradora existente na API.                                                  |
| `E2E_ADMIN_PASSWORD` | Para cenarios com administrador | Sem padrao                                 | Senha da conta administradora usada nos testes.                                                       |
| `CI`                 |                     No pipeline | Definida pelo GitHub Actions               | Ativa as configuracoes de CI do Playwright e desabilita a instalacao de navegadores no `postinstall`. |

A configuracao esta em `src/config.ts`, que remove espacos da URL e usa o fallback local em desenvolvimento. Em producao, a ausencia de `VITE_API_BASE_URL` provoca um erro ao carregar a aplicacao; configure a variavel antes do build.

O arquivo `src/infrastructure/env.ts` tambem permite registrar e ler variaveis de ambiente em runtime por meio de `globalThis.__REDGREEN_VITE_ENV__`, mas o uso direto identificado ocorre em `src/main.tsx` com `setRuntimeEnv(import.meta.env)`.

Exemplo de `.env`:

```env
VITE_API_BASE_URL=http://localhost:3000
E2E_ADMIN_EMAIL=
E2E_ADMIN_PASSWORD=
```

O exemplo corresponde a `.env.example`. O Playwright carrega `.env` e `.env.local` com `loadEnv` do Vite e preserva variaveis ja definidas no processo. `E2E_BASE_URL` pode ser adicionada se necessario; ela nao altera a porta `5173` dos comandos de inicializacao configurados. As credenciais de teste nao devem receber o prefixo `VITE_`, usado para expor variaveis ao frontend. O arquivo `.env` esta ignorado pelo Git.

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

Foram identificados **26 arquivos de teste** em `test/`.

Areas cobertas:

- Login, autenticacao e conta excluida.
- Home, logout, ranking, bonus diario, edicao de perfil e exclusao de conta.
- `GuestRoute`.
- Ranking e `RankingPanel`.
- Validador de data de nascimento.
- Modais de resultado e aviso de sessao.
- Criacao e edicao de mesas de Slot Machine.
- Criacao de mesas de Gambit.
- Cards de mesas de Slot e Gambit.
- Cores de mesa.
- API e fluxo visual da Slot Machine.
- Entrada/aproximacao da Slot Machine.
- Fluxo de jogo da Slot Machine com sessao ativa, reroll, cash-out e bloqueio de input.
- API, mapeadores, cartas, auto cash-out, sala e fluxo de jogo do Gambit.
- Controller de recompensa por cartas.

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

Se os navegadores ainda nao estiverem instalados, execute `npx playwright install`. No Linux/CI, o pipeline usa `npx playwright install --with-deps` para instalar tambem as dependencias do sistema.

Configuracoes de execucao:

- Projetos `chromium`, `firefox` e `webkit`, com perfis desktop.
- Um worker (`workers: 1`), mesmo com `fullyParallel: true` habilitado.
- Sem repeticao automatica local; uma nova tentativa em caso de falha no CI.
- `test.only` proibido no CI por `forbidOnly`.
- Localmente, inicia `npm run dev -- --port 5173` ou reutiliza um servidor existente no endereco configurado.
- No CI, executa `npm run build && npm run preview -- --port 5173`, sem reutilizar servidor existente.
- Tempo limite de 120 segundos para o servidor ficar disponivel.

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

Scripts relevantes:

```bash
npm run lint
npm run lint:check
npm run format
npm run format:check
npm run build
npm test
npm run test:e2e
```

Os comandos `lint` e `format` alteram arquivos; `lint:check` e `format:check` apenas verificam e sao usados no CI.

## 16. Pipeline CI/CD

O arquivo `.github/workflows/ci.yml` define o pipeline no **GitHub Actions**, disparado em pushes para `main` e em pull requests. Execucoes anteriores do mesmo workflow e referencia sao canceladas quando uma nova execucao comeca.

1. `install`: instala dependencias com `npm install --legacy-peer-deps`.
2. `lint`: executa `npm run lint:check` e `npm run format:check`.
3. `test`: executa a suite Jest com `npm run test`.
4. `build`: gera o bundle e publica `dist/` como artefato `application-dist`.
5. `e2e`: instala os navegadores e dependencias do Playwright, faz build e executa `npm run test:e2e`.

Configuracoes identificadas:

- Jobs sequenciais por `needs`, em `ubuntu-latest`, com Node.js 22, cache do npm e limite de 15 minutos por job.
- Cada job faz checkout e instala suas dependencias novamente.
- Artefatos `application-dist` e `playwright-report` mantidos por 7 dias.
- Upload de `playwright-report/` com `if: always()`, inclusive quando os testes falham, se houver relatorio gerado.
- Nao ha etapa de deploy no workflow atual nem `Jenkinsfile` no repositorio.

Lacunas identificadas:

- O workflow ainda nao inicia backend/banco nem injeta `VITE_API_BASE_URL`, `E2E_ADMIN_EMAIL` e `E2E_ADMIN_PASSWORD`. Os casos que usam API real dependem dessa preparacao; os que exigem administrador sao ignorados sem credenciais.
- O preview usado no CI e um build de producao e exige a URL da API configurada antes do build. A URL passada ao servidor de preview nao substitui a configuracao incorporada no bundle.
- Existe upload do relatorio HTML, mas nao um artefato separado de `test-results/`.

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

## 18. Uso de IA

Patrick Augusto Lins de Oliveira Damião
Foi utilizado o Copilot, sempre com o contexto do README explicando a estrutura do projeto (com foco na stack) e apoio do documento com as orientações da tarefa. Durante todas as etapas de desenvolvimento dos testes com o Playwright o processo foi feito a partir de instruções detalhadas de cada etapa (incluindo os momentos onde deveriam ser salvas screenshots), com a maior parte do código sendo gerado diretamente pela IA. A IA ficou responsável apenas por criar o código dos testes, mas a idealização dos testes foi feita por conta própria.
A IA também foi utilizada para desenvolver os testes de performance, tanto na elaboração do que poderia ser testado quanto na criação dos códigos de teste.

Antonio Feliciano da Silveira Neto 
Durante o desenvolvimento da suíte de testes, utilizei o Claude (Anthropic) como apoio ao processo de criação dos casos de teste. Usei o Claude no navegador para pensar e estruturar os prompts a partir da minha ideia inicial de cada cenário descrevendo em linguagem natural o fluxo que eu queria testar, as telas envolvidas e o que deveria ser validado e o Claude ajudava a organizar e refinar essa descrição. Com o prompt já mais claro e estruturado, eu o utilizava na extensão do Claude no VSCode para apoiar a implementação do código de automação. A execução, validação e revisão final dos testes foram feitas por mim, com a IA atuando apenas como suporte ao raciocínio e à escrita do código, não como substituta da autoria do trabalho.

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

História 1 — Cadastro de usuário · Prioridade: Alta
Como visitante, eu quero criar uma conta com e-mail e senha para que eu possa acessar o cassino e receber meu saldo inicial de fichas.
Critérios de aceitação:

Dado que estou na tela de cadastro, quando preencho e-mail válido e senha forte e confirmo, então minha conta é criada e recebo um saldo inicial de fichas.
Dado que informo um e-mail já cadastrado, quando submeto, então recebo mensagem de erro e o cadastro não é concluído.
Dado que a senha não atende às regras de validação, quando submeto, então a validação do formulário bloqueia o envio e exibe o erro antes de chamar a API.

História 2 — Reroll de slot · Prioridade: Alta
Como jogador do cassino, eu quero selecionar um slot específico para realizar um reroll para que eu possa tentar melhorar minha combinação e aumentar minhas chances de obter uma recompensa maior.
Critérios de aceitação:

Dado que possuo rerolls disponíveis, quando seleciono um dos slots permitidos, então o sistema destaca visualmente o slot escolhido.
Dado que um slot foi selecionado, quando confirmo a ação de reroll, então apenas o slot escolhido executa novamente a animação de giro.
Dado que o reroll foi concluído, quando o backend retorna o novo resultado, então o símbolo exibido no slot corresponde exatamente ao valor recebido.
Dado que um reroll foi utilizado, quando a operação é concluída, então a quantidade restante de rerolls é atualizada na interface.
Dado que não possuo mais rerolls disponíveis, quando tento realizar um novo reroll, então o sistema não permite a ação e mantém o estado atual dos slots.

História 3 — Ranking de jogadores · Prioridade: Média
Como jogador competitivo, eu quero ver um ranking dos jogadores para que eu possa comparar meu desempenho com os demais.
Critérios de aceitação:

Dado que existem jogadores cadastrados, quando acesso a tela de ranking, então vejo a lista ordenada pelo saldo de fichas.
Dado que meu saldo é alterado, quando o ranking é recalculado, então minha posição reflete a mudança.

História 4 — Bônus diário · Prioridade: Média
Como jogador autenticado, eu quero resgatar meu bônus diário de fichas para que eu possa aumentar meu saldo e continuar jogando.
Critérios de aceitação:
Dado que estou logado e ainda não resgatei o bônus do dia, quando acesso o painel de bônus diário, então vejo o dia atual da sequência e posso resgatar a recompensa.
Dado que o bônus diário já foi resgatado, quando acesso o painel novamente, então o botão de resgate aparece bloqueado com a informação de que o bônus já foi coletado.
Dado que o resgate é concluído com sucesso, quando a API retorna a recompensa, então o saldo de fichas é atualizado na interface.

História 5 — Gerenciamento de mesas de jogo · Prioridade: Alta
Como administrador, eu quero criar, editar, desativar e remover mesas de jogo para que eu possa controlar quais mesas estarão disponíveis aos jogadores.
Critérios de aceitação:
Dado que estou autenticado como administrador, quando acesso a tela de mesas, então vejo a opção de criar uma nova mesa.
Dado que informo dados inválidos ao criar ou editar uma mesa, quando tento salvar, então recebo uma mensagem de erro e a operação não é concluída.
Dado que uma mesa está ativa, quando tento excluí-la, então a exclusão fica bloqueada até que a mesa seja desativada.
Dado que uma mesa possui sessões ativas, quando tento desativá-la, então o sistema exibe um aviso antes de concluir a operação.

## 22. Conclusao

O RedGreen Frontend apresenta uma aplicacao React com arquitetura organizada em camadas, integracao com API, cache com SWR, interface visual consistente e dois sistemas de jogo implementados. A base de testes cobre diversos fluxos relevantes, especialmente autenticação, ranking, modais, Slot Machine e Gambit.

As principais lacunas identificadas para evolucao academica e tecnica sao a remocao ou conclusao de placeholders, a integracao real de schemas/formularios com as bibliotecas ja instaladas, a preparacao completa do ambiente E2E no pipeline CI/CD e a limpeza de arquivos residuais do template inicial. Jest e Playwright ja possuem etapas no GitHub Actions, e a suite de navegador registra evidencias dos fluxos de autenticacao, administracao de mesas e edicao de perfil.
