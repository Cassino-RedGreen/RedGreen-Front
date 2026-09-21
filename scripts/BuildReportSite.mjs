import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';

const RootDir = resolve(process.cwd());
const ReportDir = join(RootDir, 'playwright-report');
const ResultsFile = join(ReportDir, 'results.json');
const TestResultsDir = join(RootDir, 'test-results');
const SiteDir = join(RootDir, '_site');
const AssetsDir = join(SiteDir, 'assets');

if (!existsSync(ResultsFile)) {
  console.error(
    'playwright-report/results.json nao encontrado. Rode "npm run test:e2e" antes.'
  );
  process.exit(1);
}

const Results = JSON.parse(readFileSync(ResultsFile, 'utf8'));
const Stats = Results.stats ?? {};

const EscapeHtml = (Value) =>
  String(Value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const Slugify = (Value) => String(Value).replace(/[^A-Za-z0-9._-]+/g, '-');

const FormatDuration = (Milliseconds) => {
  const Seconds = (Milliseconds ?? 0) / 1000;
  if (Seconds < 60) return `${Seconds.toFixed(1)}s`;
  const Minutes = Math.floor(Seconds / 60);
  return `${Minutes}m ${Math.round(Seconds % 60)}s`;
};

const FormatDateTime = (Value) => {
  if (!Value) return '-';
  return new Date(Value).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
};

const StatusOf = (Test) => {
  if (Test.status === 'expected') return 'passed';
  if (Test.status === 'unexpected') return 'failed';
  return Test.status;
};

const StatusLabels = {
  passed: 'Aprovado',
  failed: 'Reprovado',
  flaky: 'Instavel',
  skipped: 'Ignorado',
};

const ResolveAttachment = (AttachmentPath) => {
  if (!AttachmentPath) return null;
  const Normalized = AttachmentPath.replace(/\\/g, '/');
  const Marker = '/test-results/';
  const Position = Normalized.indexOf(Marker);
  if (Position >= 0) {
    const Candidate = join(
      TestResultsDir,
      Normalized.slice(Position + Marker.length)
    );
    if (existsSync(Candidate)) return Candidate;
  }
  return existsSync(AttachmentPath) ? AttachmentPath : null;
};

const CollectSpecs = (Suite, Bag) => {
  for (const Spec of Suite.specs ?? []) Bag.push({ Spec, Suite });
  for (const Child of Suite.suites ?? []) CollectSpecs(Child, Bag);
  return Bag;
};

let MissingAttachments = 0;

const BuildScenarios = () =>
  (Results.suites ?? []).map((FileSuite) => {
    const Name = (FileSuite.title ?? FileSuite.file ?? 'unknown').replace(
      /\.spec\.ts$/,
      ''
    );
    const Entries = CollectSpecs(FileSuite, []);
    const SuiteTitles = new Set();
    const Browsers = new Set();
    const Cases = [];
    let Passed = 0;
    let Failed = 0;
    let Flaky = 0;
    let Skipped = 0;
    let Duration = 0;
    let Retries = 0;
    let StartedAt = null;

    for (const { Spec, Suite } of Entries) {
      if (Suite.title && Suite.title !== FileSuite.title)
        SuiteTitles.add(Suite.title);

      for (const Test of Spec.tests ?? []) {
        const Status = StatusOf(Test);
        const Attempts = Test.results ?? [];
        const Last = Attempts[Attempts.length - 1] ?? {};
        const TestDuration = Attempts.reduce(
          (Sum, Attempt) => Sum + (Attempt.duration ?? 0),
          0
        );

        Browsers.add(Test.projectName);
        Duration += TestDuration;
        Retries += Math.max(Attempts.length - 1, 0);
        if (Status === 'passed') Passed += 1;
        else if (Status === 'failed') Failed += 1;
        else if (Status === 'flaky') Flaky += 1;
        else Skipped += 1;
        if (Last.startTime && (!StartedAt || Last.startTime < StartedAt))
          StartedAt = Last.startTime;

        const Screenshots = [];
        let Video = null;

        for (const Attempt of Attempts) {
          for (const Attachment of Attempt.attachments ?? []) {
            const IsImage = Attachment.contentType === 'image/png';
            const IsVideo = Attachment.contentType === 'video/webm';
            if (!IsImage && !IsVideo) continue;

            const Source = ResolveAttachment(Attachment.path);
            if (!Source) {
              MissingAttachments += 1;
              continue;
            }

            const FileName = `${Slugify(Attachment.name)}${extname(Source)}`;
            const Relative = join(
              'assets',
              Slugify(Name),
              Slugify(Test.projectName),
              Slugify(Spec.title).slice(0, 40),
              FileName
            ).replace(/\\/g, '/');
            const Target = join(SiteDir, Relative);
            mkdirSync(dirname(Target), { recursive: true });
            copyFileSync(Source, Target);

            if (IsImage) Screenshots.push({ Name: Attachment.name, Relative });
            else Video = Relative;
          }
        }

        Cases.push({
          Title: Spec.title,
          Browser: Test.projectName,
          Status,
          Duration: TestDuration,
          Attempts: Attempts.length,
          StartedAt: Last.startTime ?? null,
          Errors: (Last.errors ?? []).map(
            (Error) => Error.message ?? String(Error)
          ),
          Screenshots,
          Video,
        });
      }
    }

    const Total = Cases.length;
    const Status =
      Failed > 0
        ? 'failed'
        : Flaky > 0
          ? 'flaky'
          : Passed > 0
            ? 'passed'
            : 'skipped';

    return {
      Name,
      File: FileSuite.file ?? `${Name}.spec.ts`,
      Page: `report-${Slugify(Name)}.html`,
      SuiteTitle: [...SuiteTitles].join(' / ') || Name,
      Browsers: [...Browsers],
      Cases,
      Passed,
      Failed,
      Flaky,
      Skipped,
      Total,
      Duration,
      Retries,
      StartedAt,
      Status,
    };
  });

rmSync(SiteDir, { recursive: true, force: true });
mkdirSync(AssetsDir, { recursive: true });

const Scenarios = BuildScenarios().sort((Left, Right) =>
  Left.Name.localeCompare(Right.Name)
);

const OverallStatus =
  (Stats.unexpected ?? 0) > 0
    ? 'failed'
    : (Stats.flaky ?? 0) > 0
      ? 'flaky'
      : 'passed';

const Totals = Scenarios.reduce(
  (Sum, Scenario) => ({
    Total: Sum.Total + Scenario.Total,
    Passed: Sum.Passed + Scenario.Passed,
    Failed: Sum.Failed + Scenario.Failed,
    Skipped: Sum.Skipped + Scenario.Skipped,
    Flaky: Sum.Flaky + Scenario.Flaky,
  }),
  { Total: 0, Passed: 0, Failed: 0, Skipped: 0, Flaky: 0 }
);

const ServerUrl = process.env.GITHUB_SERVER_URL ?? 'https://github.com';
const Repository = process.env.GITHUB_REPOSITORY ?? '';
const CommitSha = process.env.GITHUB_SHA ?? '';
const RunId = process.env.GITHUB_RUN_ID ?? '';
const RunNumber = process.env.GITHUB_RUN_NUMBER ?? '';
const StartedAt = Stats.startTime ? new Date(Stats.startTime) : new Date();

const CommitCell = CommitSha
  ? `<a href="${ServerUrl}/${Repository}/commit/${CommitSha}">${CommitSha.slice(0, 7)}</a>`
  : 'local';
const RunCell = RunId
  ? `<a href="${ServerUrl}/${Repository}/actions/runs/${RunId}">#${RunNumber || RunId}</a>`
  : 'local';

const Card = (Label, Value, Tone) => `
        <div class="card ${Tone}">
          <span class="card-label">${EscapeHtml(Label)}</span>
          <strong class="card-value">${EscapeHtml(Value)}</strong>
        </div>`;

const Panel = (Title, Rows) => `
      <section class="panel">
        <h2>${EscapeHtml(Title)}</h2>
        <dl>${Rows.map(
          ([Label, Value]) => `
          <div>
            <dt>${EscapeHtml(Label)}</dt>
            <dd>${Value}</dd>
          </div>`
        ).join('')}
        </dl>
      </section>`;

const Layout = ({ Title, Body, Footer }) => `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${EscapeHtml(Title)}</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <main>${Body}
      <footer>${Footer}
      </footer>
    </main>
  </body>
</html>
`;

const SharedFooter = `
        <div><span>Data</span>${FormatDateTime(StartedAt)}</div>
        <div><span>Commit</span>${CommitCell}</div>
        <div><span>Run</span>${RunCell}</div>
        <div>
          <span>Relatorio bruto</span
          ><a href="report/index.html">Playwright report</a>
        </div>`;

const IndexRows = Scenarios.map(
  (Scenario) => `
          <tr>
            <td>
              <a class="scenario" href="${Scenario.Page}"
                >${EscapeHtml(Scenario.Name)}</a
              ><span class="hint">${EscapeHtml(Scenario.SuiteTitle)}</span>
            </td>
            <td class="status ${Scenario.Status}">
              ${StatusLabels[Scenario.Status]}
            </td>
            <td class="number">${Scenario.Passed}/${Scenario.Total}</td>
            <td>${EscapeHtml(Scenario.Browsers.join(', '))}</td>
            <td class="number">${FormatDuration(Scenario.Duration)}</td>
            <td><a href="${Scenario.Page}">Abrir relatorio</a></td>
          </tr>`
).join('');

const IndexBody = `
      <header class="page-header">
        <div>
          <p class="eyebrow">RedGreen Frontend</p>
          <h1>Relatorio de testes E2E</h1>
        </div>
        <span class="pill ${OverallStatus}">${StatusLabels[OverallStatus]}</span>
      </header>
      <div class="cards">${[
        Card('Cenarios', String(Scenarios.length), 'neutral'),
        Card('Execucoes', String(Totals.Total), 'neutral'),
        Card('Aprovadas', String(Totals.Passed), 'passed'),
        Card(
          'Reprovadas',
          String(Totals.Failed),
          Totals.Failed ? 'failed' : 'neutral'
        ),
        Card(
          'Ignoradas',
          String(Totals.Skipped),
          Totals.Skipped ? 'skipped' : 'neutral'
        ),
        Card('Duracao', FormatDuration(Stats.duration), 'neutral'),
      ].join('')}
      </div>
      <section class="panel">
        <h2>Cenarios executados</h2>
        <table>
          <thead>
            <tr>
              <th>Cenario</th>
              <th>Resultado</th>
              <th>Execucoes</th>
              <th>Navegadores</th>
              <th>Duracao</th>
              <th>Detalhes</th>
            </tr>
          </thead>
          <tbody>${IndexRows}
          </tbody>
        </table>
      </section>`;

const CaseRows = (Scenario) =>
  Scenario.Cases.map(
    (Case) => `
            <tr>
              <td>${EscapeHtml(Case.Title)}</td>
              <td>${EscapeHtml(Case.Browser)}</td>
              <td class="status ${Case.Status}">${StatusLabels[Case.Status]}</td>
              <td class="number">${Case.Attempts}</td>
              <td class="number">${FormatDuration(Case.Duration)}</td>
            </tr>`
  ).join('');

const EvidenceBlocks = (Scenario) =>
  Scenario.Cases.filter((Case) => Case.Screenshots.length > 0 || Case.Video)
    .map(
      (Case) => `
        <article class="evidence">
          <h3>
            ${EscapeHtml(Case.Title)}
            <span class="badge">${EscapeHtml(Case.Browser)}</span>
          </h3>
${
  Case.Video
    ? `
          <figure class="recording">
            <video
              controls
              preload="metadata"${
                Case.Screenshots.length > 0
                  ? `
              poster="${Case.Screenshots[0].Relative}"`
                  : ''
              }
              src="${Case.Video}"
            ></video>
            <figcaption>
              Gravacao da execucao &middot;
              <a href="${Case.Video}" download>baixar video</a>
            </figcaption>
          </figure>`
    : ''
}${
        Case.Screenshots.length > 0
          ? `
          <div class="shots">${Case.Screenshots.map(
            (Shot) => `
            <figure>
              <a href="${Shot.Relative}" target="_blank" rel="noreferrer"
                ><img
                  src="${Shot.Relative}"
                  alt="${EscapeHtml(Shot.Name)}"
                  loading="lazy"
              /></a>
              <figcaption>${EscapeHtml(Shot.Name)}</figcaption>
            </figure>`
          ).join('')}
          </div>`
          : ''
      }
        </article>`
    )
    .join('');

const ErrorBlocks = (Scenario) => {
  const Failing = Scenario.Cases.filter((Case) => Case.Errors.length > 0);
  if (Failing.length === 0) return '';
  return `
      <section class="panel">
        <h2>Falhas</h2>${Failing.map(
          (Case) => `
        <article class="failure">
          <h3>
            ${EscapeHtml(Case.Title)}
            <span class="badge">${EscapeHtml(Case.Browser)}</span>
          </h3>${Case.Errors.map(
            (Message) => `
          <pre>${EscapeHtml(Message)}</pre>`
          ).join('')}
        </article>`
        ).join('')}
      </section>`;
};

const ScenarioBody = (Scenario) => {
  const Evidence = EvidenceBlocks(Scenario);
  return `
      <nav class="back"><a href="index.html">&larr; Voltar ao resumo</a></nav>
      <header class="page-header">
        <div>
          <p class="eyebrow">${EscapeHtml(Scenario.SuiteTitle)}</p>
          <h1>${EscapeHtml(Scenario.Name)}</h1>
        </div>
        <span class="pill ${Scenario.Status}"
          >${StatusLabels[Scenario.Status]}</span
        >
      </header>
      <div class="cards">${[
        Card('Execucoes', String(Scenario.Total), 'neutral'),
        Card('Aprovadas', String(Scenario.Passed), 'passed'),
        Card(
          'Reprovadas',
          String(Scenario.Failed),
          Scenario.Failed ? 'failed' : 'neutral'
        ),
        Card(
          'Ignoradas',
          String(Scenario.Skipped),
          Scenario.Skipped ? 'skipped' : 'neutral'
        ),
      ].join('')}
      </div>${Panel('Informacoes do arquivo', [
        ['Arquivo', `<code>e2e/${EscapeHtml(Scenario.File)}</code>`],
        ['Suite', EscapeHtml(Scenario.SuiteTitle)],
        ['Navegadores', EscapeHtml(Scenario.Browsers.join(', '))],
        [
          'Casos de teste',
          EscapeHtml(
            String(new Set(Scenario.Cases.map((Case) => Case.Title)).size)
          ),
        ],
      ])}${Panel('Tempos e dados', [
        ['Inicio', FormatDateTime(Scenario.StartedAt ?? Stats.startTime)],
        ['Duracao total', FormatDuration(Scenario.Duration)],
        [
          'Duracao media',
          FormatDuration(
            Scenario.Total ? Scenario.Duration / Scenario.Total : 0
          ),
        ],
        ['Novas tentativas', String(Scenario.Retries)],
      ])}
      <section class="panel">
        <h2>Resumo das execucoes</h2>
        <table>
          <thead>
            <tr>
              <th>Caso</th>
              <th>Navegador</th>
              <th>Resultado</th>
              <th>Tentativas</th>
              <th>Duracao</th>
            </tr>
          </thead>
          <tbody>${CaseRows(Scenario)}
          </tbody>
        </table>
      </section>${ErrorBlocks(Scenario)}${
        Evidence
          ? `
      <section class="panel">
        <h2>Evidencias</h2>${Evidence}
      </section>`
          : ''
      }`;
};

const Styles = `:root {
  color-scheme: dark;
  --background: #0b0f14;
  --surface: #11161d;
  --surface-strong: #161d26;
  --border: #232c38;
  --text: #e6edf3;
  --muted: #8b98a8;
  --accent: #58a6ff;
  --passed: #3fb950;
  --failed: #f85149;
  --flaky: #d29922;
  --skipped: #8b98a8;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 48px 24px 72px;
  background: var(--background);
  color: var(--text);
  font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  line-height: 1.5;
}

main {
  max-width: 1100px;
  margin: 0 auto;
}

a {
  color: var(--accent);
}

.back {
  margin-bottom: 20px;
  font-size: 14px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--muted);
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

h1 {
  margin: 0;
  font-size: 32px;
  letter-spacing: -0.02em;
}

.pill {
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid currentColor;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 28px;
}

.card {
  padding: 18px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
}

.card-label {
  display: block;
  color: var(--muted);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.card-value {
  display: block;
  margin-top: 6px;
  font-size: 28px;
  font-weight: 600;
}

.card.passed .card-value,
.pill.passed,
.status.passed {
  color: var(--passed);
}

.card.failed .card-value,
.pill.failed,
.status.failed {
  color: var(--failed);
}

.card.flaky .card-value,
.pill.flaky,
.status.flaky {
  color: var(--flaky);
}

.card.skipped .card-value,
.pill.skipped,
.status.skipped {
  color: var(--skipped);
}

.panel {
  margin-bottom: 24px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  overflow: hidden;
}

.panel h2 {
  margin: 0;
  padding: 14px 18px;
  background: var(--surface-strong);
  border-bottom: 1px solid var(--border);
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}

.panel dl {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 18px;
  margin: 0;
  padding: 18px;
}

.panel dt {
  color: var(--muted);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.panel dd {
  margin: 4px 0 0;
  font-size: 15px;
}

code {
  font-family: ui-monospace, 'Cascadia Code', Consolas, monospace;
  font-size: 13px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

th,
td {
  text-align: left;
  padding: 13px 18px;
  border-bottom: 1px solid var(--border);
  vertical-align: top;
}

tbody tr:last-child td {
  border-bottom: none;
}

th {
  color: var(--muted);
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

tbody tr:hover {
  background: var(--surface-strong);
}

.number {
  text-align: right;
  white-space: nowrap;
}

.scenario {
  font-weight: 600;
  text-decoration: none;
}

.hint {
  display: block;
  color: var(--muted);
  font-size: 12px;
  margin-top: 2px;
}

.status {
  font-weight: 600;
  white-space: nowrap;
}

.evidence,
.failure {
  padding: 18px;
  border-bottom: 1px solid var(--border);
}

.evidence:last-child,
.failure:last-child {
  border-bottom: none;
}

.evidence h3,
.failure h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 14px;
  font-size: 15px;
}

.badge {
  padding: 2px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-strong);
  color: var(--muted);
  font-size: 12px;
  font-weight: 500;
}

.shots {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

figure {
  margin: 0;
}

figure img {
  display: block;
  width: 100%;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #000;
}

figcaption {
  margin-top: 6px;
  color: var(--muted);
  font-size: 12px;
}

.recording {
  margin: 0 0 22px;
}

video {
  display: block;
  width: 100%;
  max-width: 720px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #000;
}

pre {
  margin: 0 0 12px;
  padding: 14px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #0d1117;
  color: #ffa198;
  font-size: 13px;
  overflow-x: auto;
  white-space: pre-wrap;
}

footer {
  display: flex;
  flex-wrap: wrap;
  gap: 40px;
  margin-top: 32px;
  font-size: 13px;
}

footer span {
  display: block;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 11px;
  margin-bottom: 6px;
}

@media (max-width: 720px) {
  body {
    padding: 24px 16px 48px;
  }

  h1 {
    font-size: 26px;
  }

  th:nth-child(4),
  td:nth-child(4) {
    display: none;
  }
}
`;

cpSync(ReportDir, join(SiteDir, 'report'), { recursive: true });

writeFileSync(join(SiteDir, 'styles.css'), Styles, 'utf8');
writeFileSync(join(SiteDir, '.nojekyll'), '', 'utf8');
writeFileSync(
  join(SiteDir, 'index.html'),
  Layout({
    Title: 'RedGreen | Relatorio de testes E2E',
    Body: IndexBody,
    Footer: SharedFooter,
  }),
  'utf8'
);

for (const Scenario of Scenarios) {
  writeFileSync(
    join(SiteDir, Scenario.Page),
    Layout({
      Title: `RedGreen | ${Scenario.Name}`,
      Body: ScenarioBody(Scenario),
      Footer: SharedFooter,
    }),
    'utf8'
  );
}

if (MissingAttachments > 0) {
  console.warn(
    `${MissingAttachments} anexos nao foram encontrados em test-results e ficaram de fora das evidencias.`
  );
}

console.log(
  `Site gerado em _site: ${Scenarios.length} cenarios, ${Totals.Total} execucoes (${OverallStatus}).`
);
