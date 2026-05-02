// CLI entry point for the dist-size summariser. Pure logic lives in
// `lib/dist_stats_lib.ts` (and is exercised from `tests/`).
//
// Usage: node dist_stats.ts <dir>
import { walkFiles, summarise } from './lib/dist_stats_lib.ts';

async function main(): Promise<void> {
  const root = process.argv[2];
  if (!root) {
    console.error('Usage: node dist_stats.ts <dir>');
    process.exit(2);
  }
  const files = await walkFiles(root);
  const result = summarise(files, root);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
