#!/usr/bin/env node
/**
 * Check for new OSS releases
 * Entry point for GitHub Actions workflow
 */

import { ReleaseMonitor } from './components/ReleaseMonitor.js';
import { loadConfig, getConfig } from './utils/config.js';
import logger from './utils/logger.js';
import { appendFileSync } from 'fs';

async function main() {
  try {
    const config = loadConfig();
    logger.info('Starting release check', {
      repository: config.github.repository,
      shortName: config.github.shortName
    });

    const monitor = new ReleaseMonitor();
    const newReleases = await monitor.checkForNewReleases();

    if (newReleases.length === 0) {
      logger.info('No new releases found');
      setOutput('has_new_releases', 'false');
      setOutput('versions', '');
      return;
    }

    const versions = newReleases.map(r => r.version);
    logger.info('New releases found', { versions });

    // Output for GitHub Actions
    setOutput('has_new_releases', 'true');
    setOutput('versions', versions.join(','));
    setOutput('version', versions[0]); // First (oldest) version
    setOutput('release_type', newReleases[0].releaseType);
    setOutput('repository', config.github.repository);
    setOutput('owner', config.github.owner);
    setOutput('short_name', config.github.shortName);
    setOutput('site_id', config.github.siteId);
    setOutput('display_name', config.github.displayName);

    // Log release details
    for (const release of newReleases) {
      logger.info('Release details', {
        version: release.version,
        releaseType: release.releaseType,
        releaseDate: release.releaseDate.toISOString(),
        releaseUrl: release.releaseUrl
      });
    }

  } catch (error) {
    logger.error('Release check failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

/**
 * Set GitHub Actions output
 */
function setOutput(name, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    appendFileSync(outputFile, `${name}=${value}\n`);
  }
  // Also log for local testing
  console.log(`::set-output name=${name}::${value}`);
}

main();
