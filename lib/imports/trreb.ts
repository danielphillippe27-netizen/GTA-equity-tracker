import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

export interface UploadedImportFile {
  file: File;
  relativePath?: string;
}

export interface StagedImportSummary {
  workspaceId: string;
  hpiCount: number;
  marketWatchCount: number;
  historicFile: string | null;
  rawFileCount: number;
  canRunTrrebImport: boolean;
  stagedRoot: string;
  files: Array<{
    name: string;
    category: 'hpi' | 'market-watch' | 'historic' | 'raw';
    stagedPath: string;
  }>;
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-');
}

function classifyTrrebFile(fileName: string, relativePath?: string) {
  const source = `${relativePath || ''} ${fileName}`.toLowerCase();
  if (!source.endsWith('.pdf')) {
    return null;
  }

  if (source.includes('historic')) {
    return 'historic' as const;
  }

  if (
    source.includes('market watch') ||
    source.includes('market_watch') ||
    /^mw\d/.test(fileName.toLowerCase())
  ) {
    return 'market-watch' as const;
  }

  if (
    source.includes('hpi') ||
    source.includes('benchmark summary') ||
    source.includes('trreb_mls_hpi')
  ) {
    return 'hpi' as const;
  }

  return null;
}

export async function stageTrrebImportFiles(
  workspaceId: string,
  jobId: string,
  uploads: UploadedImportFile[]
) {
  const importRoot = path.join(process.cwd(), '.import-jobs', workspaceId, jobId);
  const hpiDir = path.join(importRoot, 'hpi');
  const marketWatchDir = path.join(importRoot, 'market-watch');
  const historicDir = path.join(importRoot, 'historic');
  const rawDir = path.join(importRoot, 'raw');

  await fs.mkdir(hpiDir, { recursive: true });
  await fs.mkdir(marketWatchDir, { recursive: true });
  await fs.mkdir(historicDir, { recursive: true });
  await fs.mkdir(rawDir, { recursive: true });

  const stagedFiles: StagedImportSummary['files'] = [];
  let historicFile: string | null = null;
  let rawFileCount = 0;

  for (const [index, upload] of uploads.entries()) {
    const safeName = `${String(index + 1).padStart(3, '0')}-${sanitizeFileName(upload.file.name)}`;
    const bytes = Buffer.from(await upload.file.arrayBuffer());
    const category = classifyTrrebFile(upload.file.name, upload.relativePath);

    if (!category) {
      const stagedPath = path.join(rawDir, safeName);
      await fs.writeFile(stagedPath, bytes);
      rawFileCount += 1;
      stagedFiles.push({
        name: upload.file.name,
        category: 'raw',
        stagedPath,
      });
      continue;
    }

    if (category === 'historic') {
      const stagedPath = path.join(historicDir, safeName);
      await fs.writeFile(stagedPath, bytes);
      historicFile = stagedPath;
      stagedFiles.push({
        name: upload.file.name,
        category,
        stagedPath,
      });
      continue;
    }

    const targetDir = category === 'hpi' ? hpiDir : marketWatchDir;
    const stagedPath = path.join(targetDir, safeName);
    await fs.writeFile(stagedPath, bytes);
    stagedFiles.push({
      name: upload.file.name,
      category,
      stagedPath,
    });
  }

  const summary: StagedImportSummary = {
    workspaceId,
    hpiCount: stagedFiles.filter((file) => file.category === 'hpi').length,
    marketWatchCount: stagedFiles.filter((file) => file.category === 'market-watch').length,
    historicFile,
    rawFileCount,
    canRunTrrebImport: false,
    stagedRoot: importRoot,
    files: stagedFiles,
  };
  summary.canRunTrrebImport =
    summary.hpiCount > 0 && summary.marketWatchCount > 0 && Boolean(summary.historicFile);

  return summary;
}

async function resolveImporterScriptPath() {
  const candidates = [
    path.join(process.cwd(), 'scripts', 'import_trreb_market_data.py'),
    '/Volumes/Untitled 2/IMPORT TRREB DATA/import_trreb_market_data.py',
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error('TRREB importer script was not found.');
}

function extractImportSummary(output: string) {
  const match = output.match(/\{\s*"market_hpi_rows"[\s\S]*?\}/);
  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[0]) as Record<string, number>;
  } catch {
    return null;
  }
}

export async function runTrrebImport(staged: StagedImportSummary) {
  const scriptPath = await resolveImporterScriptPath();
  const args = [
    scriptPath,
    '--workspace-id',
    staged.workspaceId,
    '--hpi-dir',
    path.join(staged.stagedRoot, 'hpi'),
    '--market-watch-dir',
    path.join(staged.stagedRoot, 'market-watch'),
    '--historic-pdf',
    staged.historicFile!,
    '--taxonomy-json',
    path.join(process.cwd(), 'src', 'data', 'trreb-taxonomy.json'),
    '--apply',
  ];

  const output = await new Promise<string>((resolve, reject) => {
    const child = spawn('python3', args, {
      cwd: process.cwd(),
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || stdout || `Import failed with exit code ${code}`));
        return;
      }

      resolve(stdout);
    });
  });

  return {
    output,
    parsedSummary: extractImportSummary(output),
  };
}
