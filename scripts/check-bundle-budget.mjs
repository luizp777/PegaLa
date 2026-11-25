import { appendFileSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const ASSETS_DIR = join(process.cwd(), 'dist', 'assets');
const KB = 1024;

const BUDGETS = {
  entryJs: 55 * KB,
  entryCss: 14 * KB,
  shareModal: 11 * KB,
  priceCompareSheet: 14 * KB,
  lazyChunk: 6 * KB,
  initialTotalJs: 250 * KB,
};

const LAZY_CHUNKS = ['QuickCatalogDrawer-', 'CategoryPickerSheet-', 'CreateListModal-'];

const files = readdirSync(ASSETS_DIR).filter((f) => f.endsWith('.js') || f.endsWith('.css'));
const rows = files
  .map((file) => {
    const raw = readFileSync(join(ASSETS_DIR, file));
    const gzipBytes = gzipSync(raw).length;
    return { file, gzipBytes };
  })
  .sort((a, b) => a.file.localeCompare(b.file));

const failures = [];
let initialTotalJs = 0;

for (const { file, gzipBytes } of rows) {
  if (file.startsWith('index-') && file.endsWith('.js')) {
    initialTotalJs += gzipBytes;
    if (gzipBytes > BUDGETS.entryJs) {
      failures.push(`${file}: ${(gzipBytes / KB).toFixed(2)} KB > ${(BUDGETS.entryJs / KB).toFixed(0)} KB`);
    }
  } else if (file.startsWith('index-') && file.endsWith('.css')) {
    if (gzipBytes > BUDGETS.entryCss) {
      failures.push(`${file}: ${(gzipBytes / KB).toFixed(2)} KB > ${(BUDGETS.entryCss / KB).toFixed(0)} KB`);
    }
  } else if (file.startsWith('ShareModal-') && file.endsWith('.js')) {
    if (gzipBytes > BUDGETS.shareModal) {
      failures.push(`${file}: ${(gzipBytes / KB).toFixed(2)} KB > ${(BUDGETS.shareModal / KB).toFixed(0)} KB`);
    }
  } else if (file.startsWith('PriceComparisonSheet-') && file.endsWith('.js')) {
    if (gzipBytes > BUDGETS.priceCompareSheet) {
      failures.push(`${file}: ${(gzipBytes / KB).toFixed(2)} KB > ${(BUDGETS.priceCompareSheet / KB).toFixed(0)} KB`);
    }
  } else if (LAZY_CHUNKS.some((prefix) => file.startsWith(prefix)) && file.endsWith('.js')) {
    if (gzipBytes > BUDGETS.lazyChunk) {
      failures.push(`${file}: ${(gzipBytes / KB).toFixed(2)} KB > ${(BUDGETS.lazyChunk / KB).toFixed(0)} KB`);
    }
  } else if ((file.startsWith('vendor-') || file.startsWith('workbox-')) && file.endsWith('.js')) {
    initialTotalJs += gzipBytes;
  }
}

if (initialTotalJs > BUDGETS.initialTotalJs) {
  failures.push(
    `Initial JS total: ${(initialTotalJs / KB).toFixed(2)} KB > ${(BUDGETS.initialTotalJs / KB).toFixed(0)} KB`
  );
}

console.log('Bundle Gzip Report:');
for (const { file, gzipBytes } of rows) {
  console.log(`  ${file.padEnd(42)} ${(gzipBytes / KB).toFixed(2)} KB`);
}
console.log(`  ${'Initial JS total'.padEnd(42)} ${(initialTotalJs / KB).toFixed(2)} KB`);

const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) {
  const md = [
    '### Bundle Gzip Budget',
    '| Arquivo | Gzip |',
    '|---|---|',
    ...rows.map((r) => `| \`${r.file}\` | ${(r.gzipBytes / KB).toFixed(2)} KB |`),
    `| **Initial JS total** | **${(initialTotalJs / KB).toFixed(2)} KB** (limite ${(BUDGETS.initialTotalJs / KB).toFixed(0)} KB) |`,
    '',
  ].join('\n');
  appendFileSync(summaryPath, md);
}

if (failures.length > 0) {
  console.error('\nBundle budget exceeded:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log('\nAll bundle budgets passed!');
