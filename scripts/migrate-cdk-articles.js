#!/usr/bin/env node
/**
 * Migrate CDK release articles from cdk-update to aws-oss-update.
 *
 * Transformations per file:
 *   1) Filename: vX-Y-Z.md -> cdk-vX-Y-Z.md
 *   2) Frontmatter:
 *      - Remove `tags:` line
 *      - Add `repository: "cdk"`
 *      - Add `repositoryDisplayName: "AWS CDK"`
 *
 * Run once:  node scripts/migrate-cdk-articles.js
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const SRC = '/Users/ykmatsud/Documents/git/cdk-update/site/src/content/releases';
const DEST = '/Users/ykmatsud/Documents/git/github.com/mazyu36/aws-oss-update/site/src/content/releases';

if (!existsSync(DEST)) mkdirSync(DEST, { recursive: true });

const files = readdirSync(SRC).filter((f) => f.endsWith('.md'));
let migrated = 0;

for (const file of files) {
  const src = readFileSync(join(SRC, file), 'utf-8');
  const match = src.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    console.warn(`Skip (no frontmatter): ${file}`);
    continue;
  }
  let fm = match[1];
  const body = match[2];

  // Remove any tags line (single- or multi-line)
  fm = fm
    .split('\n')
    .filter((line) => !/^tags:/.test(line))
    .join('\n');

  // Inject repository / repositoryDisplayName right after `version:` line
  if (!/^repository:/m.test(fm)) {
    fm = fm.replace(
      /(^version:\s*".*"\s*$)/m,
      `$1\nrepository: "cdk"\nrepositoryDisplayName: "AWS CDK"`,
    );
  }

  const newContent = `---\n${fm}\n---\n${body}`;
  const destName = `cdk-${file}`;
  writeFileSync(join(DEST, destName), newContent);
  migrated++;
}

console.log(`Migrated ${migrated} CDK articles`);
