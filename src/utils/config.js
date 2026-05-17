import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let config = null;

export function loadConfig() {
  if (config) return config;

  // Get config file name from environment variable (default: python)
  const configName = process.env.STRANDS_CONFIG || 'python';
  const configPath = join(__dirname, `../../config/${configName}.json`);
  const rawConfig = JSON.parse(readFileSync(configPath, 'utf-8'));

  config = {
    github: {
      owner: process.env.STRANDS_OWNER || rawConfig.github.owner,
      repository: process.env.STRANDS_REPO || rawConfig.github.repository,
      displayName: rawConfig.github.displayName,
      shortName: rawConfig.github.shortName,
      siteId: rawConfig.github.siteId,
      targetBranch: process.env.GITHUB_TARGET_BRANCH || rawConfig.github.targetBranch,
      token: process.env.GITHUB_TOKEN || ''
    },
    processing: {
      maxRetries: parseInt(process.env.MAX_RETRIES) || rawConfig.processing.maxRetries,
      retryIntervalMs: parseInt(process.env.RETRY_INTERVAL_MS) || rawConfig.processing.retryIntervalMs,
      includePrerelease: process.env.INCLUDE_PRERELEASE !== 'false' && rawConfig.processing.includePrerelease
    },
    site: {
      baseUrl: process.env.SITE_BASE_URL || rawConfig.site.baseUrl,
      title: rawConfig.site.title,
      description: rawConfig.site.description
    }
  };

  return config;
}

export function getConfig() {
  if (!config) {
    return loadConfig();
  }
  return config;
}

export default { loadConfig, getConfig };
