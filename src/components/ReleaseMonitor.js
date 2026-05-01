import { Octokit } from '@octokit/rest';
import { existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getConfig } from '../utils/config.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RELEASES_DIR = join(__dirname, '../../site/src/content/releases');

// Version pattern: semver (v1.21.0, v0.1.4, v1.0.0-beta.1, etc.)
const STABLE_VERSION_PATTERN = /^v\d+\.\d+\.\d+$/;
const PRERELEASE_VERSION_PATTERN = /^v\d+\.\d+\.\d+-.+$/;
const ALPHA_VERSION_PATTERN = /^v\d+\.\d+\.\d+-alpha\.\d+$/;

// Only process releases from 2024-01-01 onwards
const MIN_RELEASE_DATE = new Date('2024-01-01T00:00:00Z');

export class ReleaseMonitor {
  constructor() {
    const config = getConfig();
    this.octokit = new Octokit({ auth: config.github.token });
    this.owner = config.github.owner;
    this.repo = config.github.repository;
    this.shortName = config.github.shortName;
    this.displayName = config.github.displayName;
    this.includePrerelease = config.processing.includePrerelease;
  }

  /**
   * Check for new releases that don't have corresponding md files
   * @returns {Promise<Array>} Array of new releases
   */
  async checkForNewReleases() {
    logger.info('Checking for new releases', { owner: this.owner, repo: this.repo });

    const releases = await this.fetchReleases();
    const existingFiles = this.getExistingReleaseFiles();
    const newReleases = this.filterNewReleases(releases, existingFiles);

    logger.info('Release check complete', {
      totalFetched: releases.length,
      existingFiles: existingFiles.size,
      newReleases: newReleases.length
    });

    return newReleases;
  }

  /**
   * Fetch releases from GitHub API
   */
  async fetchReleases() {
    try {
      const { data } = await this.octokit.repos.listReleases({
        owner: this.owner,
        repo: this.repo,
        per_page: 100
      });

      return data
        .filter(release => !release.draft)
        .filter(release => this.isValidVersion(release.tag_name))
        .map(release => this.parseRelease(release))
        .filter(release => release.releaseDate >= MIN_RELEASE_DATE);
    } catch (error) {
      logger.error('Failed to fetch releases', { error: error.message });
      throw error;
    }
  }

  /**
   * Check if version matches expected patterns
   */
  isValidVersion(tagName) {
    if (STABLE_VERSION_PATTERN.test(tagName)) return true;
    if (this.includePrerelease && PRERELEASE_VERSION_PATTERN.test(tagName)) return true;
    return false;
  }

  /**
   * Parse release data into structured format
   */
  parseRelease(release) {
    const isAlpha = ALPHA_VERSION_PATTERN.test(release.tag_name);
    const isPrerelease = !isAlpha && (PRERELEASE_VERSION_PATTERN.test(release.tag_name) || release.prerelease);
    const releaseType = isAlpha ? 'alpha' : (isPrerelease ? 'prerelease' : 'stable');
    return {
      version: release.tag_name,
      releaseType,
      releaseDate: new Date(release.published_at),
      releaseNotes: release.body || '',
      releaseUrl: release.html_url,
      isPrerelease: isAlpha || isPrerelease,
      tagUrl: `https://github.com/${this.owner}/${this.repo}/releases/tag/${release.tag_name}`,
      repository: this.repo,
      shortName: this.shortName,
      displayName: this.displayName
    };
  }

  /**
   * Get existing release files as a Set of versions
   * e.g., python-v1-21-0.md -> v1.21.0
   */
  getExistingReleaseFiles() {
    const versions = new Set();

    if (!existsSync(RELEASES_DIR)) {
      return versions;
    }

    try {
      const files = readdirSync(RELEASES_DIR);
      const prefix = `${this.shortName}-`;

      for (const file of files) {
        if (file.endsWith('.md') && file.startsWith(prefix)) {
          // Convert filename to version: python-v1-21-0.md -> v1.21.0
          const versionPart = file.replace(prefix, '').replace('.md', '');
          const version = versionPart.replace(/-/g, '.');
          versions.add(version);
        }
      }
    } catch (error) {
      logger.error('Failed to read releases directory', { error: error.message });
    }

    return versions;
  }

  /**
   * Filter releases to only those without existing md files
   */
  filterNewReleases(releases, existingFiles) {
    return releases
      .filter(release => !existingFiles.has(release.version))
      .sort((a, b) => a.releaseDate - b.releaseDate); // Sort oldest first
  }

  /**
   * Convert version to filename
   * e.g., v1.21.0 -> python-v1-21-0.md
   */
  static versionToFilename(shortName, version) {
    return `${shortName}-${version.replace(/\./g, '-')}.md`;
  }
}

export default ReleaseMonitor;
