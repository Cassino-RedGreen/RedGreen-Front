// Checks the environment before any spec runs, so a wrong setup fails once
// with a clear reason instead of as timeouts spread across the suite.

type GambitTable = {
  Active: boolean;
  CardPrice: number;
  MaxCardsPurchased: number;
  MinimumCardsPurchased: number;
  Name: string;
};

const RequiredGambitTable = {
  Name: 'High Stake Gambit',
  CardPrice: 10,
  MinimumCardsPurchased: 5,
  MaxCardsPurchased: 25,
};

const RequestTimeout = 10_000;

const Fail = (Message: string): never => {
  throw new Error(`[e2e global setup] ${Message}`);
};

const FetchFromApi = async (ApiBaseUrl: string, Path: string) => {
  const Url = `${ApiBaseUrl}${Path}`;

  try {
    return await fetch(Url, { signal: AbortSignal.timeout(RequestTimeout) });
  } catch (Error) {
    return Fail(
      `The API is not reachable at ${Url} (${(Error as Error).message}). ` +
        'Start Postgres and the backend, or set VITE_API_BASE_URL.'
    );
  }
};

const CheckAdminCredentials = () => {
  if (!process.env.CI) {
    return;
  }

  const Missing = ['E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD'].filter(
    (Name) => !process.env[Name]
  );

  if (Missing.length) {
    Fail(
      `${Missing.join(' and ')} must be set in CI. Without them the admin ` +
        'scenarios would be skipped instead of run.'
    );
  }
};

const CheckGambitTable = async (ApiBaseUrl: string) => {
  const Response = await FetchFromApi(ApiBaseUrl, '/gambit-table');

  if (!Response.ok) {
    Fail(`GET ${ApiBaseUrl}/gambit-table returned ${Response.status}.`);
  }

  const Tables = (await Response.json()) as GambitTable[];
  const Matches = Tables.filter(
    (Table) => Table.Name === RequiredGambitTable.Name
  );

  if (Matches.length === 0) {
    Fail(
      `Gambit table "${RequiredGambitTable.Name}" not found. Tables in the ` +
        `database: ${Tables.map((Table) => `"${Table.Name}"`).join(', ') || 'none'}. ` +
        'Restart the API on a clean database so the seed creates it.'
    );
  }

  if (Matches.length > 1) {
    Fail(
      `Found ${Matches.length} Gambit tables named "${RequiredGambitTable.Name}". ` +
        'The specs need exactly one; reset the database.'
    );
  }

  const [Table] = Matches;
  const Mismatches = [
    !Table.Active && 'Active=false (expected true)',
    ...(['CardPrice', 'MinimumCardsPurchased', 'MaxCardsPurchased'] as const)
      .filter((Field) => Table[Field] !== RequiredGambitTable[Field])
      .map(
        (Field) =>
          `${Field}=${Table[Field]} (expected ${RequiredGambitTable[Field]})`
      ),
  ].filter(Boolean);

  if (Mismatches.length) {
    Fail(
      `Gambit table "${RequiredGambitTable.Name}" does not match the seed: ` +
        `${Mismatches.join(', ')}. Restart the API on a clean database.`
    );
  }
};

export default async function GlobalSetup() {
  CheckAdminCredentials();

  const ApiBaseUrl = (
    process.env.VITE_API_BASE_URL ?? 'http://localhost:3000'
  ).replace(/\/+$/, '');

  await FetchFromApi(ApiBaseUrl, '/');
  await CheckGambitTable(ApiBaseUrl);
}
