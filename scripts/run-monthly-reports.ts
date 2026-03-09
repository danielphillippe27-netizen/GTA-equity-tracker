import dotenv from 'dotenv';
import { runMonthlyReports } from '../lib/monthly-reports';

dotenv.config({ path: '.env.local' });

interface CliOptions {
  dryRun: boolean;
  limit?: number;
  subscriberId?: string;
}

function parseArgs(argv: string[]): CliOptions {
  let dryRun = true;
  let limit: number | undefined;
  let subscriberId: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--send') {
      dryRun = false;
      continue;
    }

    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (arg === '--limit') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value for --limit');
      }
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error('--limit must be a positive integer');
      }
      limit = parsed;
      index += 1;
      continue;
    }

    if (arg === '--subscriber-id') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value for --subscriber-id');
      }
      subscriberId = value;
      index += 1;
      continue;
    }

    throw new Error(
      `Unknown argument "${arg}". Supported: --dry-run, --send, --limit <n>, --subscriber-id <id>`
    );
  }

  return {
    dryRun,
    limit,
    subscriberId,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const summary = await runMonthlyReports(options);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
