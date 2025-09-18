/**
 * Test utilities for update-related tests
 * 
 * Provides common mock data, helper functions, and test fixtures
 * for testing the auto-updating logic across different test types.
 */

import { GitHubRelease, UpdateInfo } from '../../src/main/services/UpdateService';
import { CachedUpdateInfo } from '../../src/main/services/UpdateCacheService';

/**
 * Sample GitHub release data for testing
 */
export const mockGitHubRelease: GitHubRelease = {
  tag_name: 'v2.1.0',
  name: 'Version 2.1.0',
  body: '## Features\n\n- **New feature**\n- *Another feature*\n\n```code block```\n\n[Link](https://example.com)',
  published_at: '2024-01-01T00:00:00Z',
  html_url: 'https://github.com/test/repo/releases/tag/v2.1.0',
  assets: [
    {
      name: 'Schedule-I-Developer-Environment-Setup-2.1.0.exe',
      browser_download_url: 'https://github.com/test/repo/releases/download/v2.1.0/setup.exe',
      size: 52428800 // 50MB
    }
  ]
};

/**
 * Sample beta release data for testing
 */
export const mockBetaRelease: GitHubRelease = {
  tag_name: 'beta',
  name: '2.1.0 BETA Release',
  body: '## Beta Features\n\n- **Experimental feature**\n- *Beta testing*',
  published_at: '2024-01-01T00:00:00Z',
  html_url: 'https://github.com/test/repo/releases/tag/beta',
  assets: []
};

/**
 * Sample pre-release data for testing
 */
export const mockPreRelease: GitHubRelease = {
  tag_name: 'v2.1.0-beta.1',
  name: 'Version 2.1.0 Beta 1',
  body: '## Pre-release\n\n- **Beta features**',
  published_at: '2024-01-01T00:00:00Z',
  html_url: 'https://github.com/test/repo/releases/tag/v2.1.0-beta.1',
  assets: []
};

/**
 * Sample update info for testing
 */
export const mockUpdateInfo: UpdateInfo = {
  hasUpdate: true,
  currentVersion: '2.0.0',
  latestVersion: '2.1.0',
  release: mockGitHubRelease
};

/**
 * Sample update info with no update available
 */
export const mockNoUpdateInfo: UpdateInfo = {
  hasUpdate: false,
  currentVersion: '2.1.0',
  latestVersion: '2.1.0'
};

/**
 * Sample cached update info for testing
 */
export const mockCachedUpdateInfo: CachedUpdateInfo = {
  updateInfo: mockUpdateInfo,
  lastChecked: new Date().toISOString(),
  release: mockGitHubRelease
};

/**
 * Sample expired cached update info
 */
export const mockExpiredCachedInfo: CachedUpdateInfo = {
  updateInfo: mockUpdateInfo,
  lastChecked: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  release: mockGitHubRelease
};

/**
 * Sample package.json content for testing
 */
export const mockPackageJson = {
  name: 'schedule-i-developer-environment-utility',
  version: '2.1.0',
  description: 'Schedule I Developer Environment Utility',
  main: 'dist/main/index.js',
  scripts: {
    dev: 'concurrently "npm run dev:main" "npm run dev:renderer"',
    build: 'npm run build:main && npm run build:renderer',
    package: 'electron-builder'
  },
  dependencies: {
    electron: '^28.0.0',
    react: '^18.2.0'
  }
};

/**
 * Sample GitHub API response for testing
 */
export const mockGitHubApiResponse = [
  mockGitHubRelease,
  {
    tag_name: 'v2.0.0',
    name: 'Version 2.0.0',
    body: 'Previous release',
    published_at: '2023-12-01T00:00:00Z',
    html_url: 'https://github.com/test/repo/releases/tag/v2.0.0',
    assets: []
  }
];

/**
 * Sample formatted release notes
 */
export const mockFormattedReleaseNotes = 'Features\n\n- New feature\n- Another feature\n\nLink';

/**
 * Version comparison test cases
 */
export const versionComparisonTestCases = [
  // [current, latest, expected]
  ['1.0.0', '1.0.1', -1],
  ['1.0.1', '1.0.0', 1],
  ['1.0.0', '1.0.0', 0],
  ['v1.0.0', '1.0.1', -1],
  ['1.0.0', 'v1.0.1', -1],
  ['v1.0.0', 'v1.0.0', 0],
  ['1.0.0', '1.0.1-beta', -1],
  ['1.0.1-beta', '1.0.1', -1],
  ['1.0.1-beta', '1.0.1-beta', 0],
  ['1.0', '1.0.0', 0],
  ['1.0', '1.0.1', -1],
  ['1.0.1', '1.0', 1],
  ['2.0.0', 'beta', -1], // Special case for beta tag
] as const;

/**
 * Error scenarios for testing
 */
export const errorScenarios = {
  networkError: new Error('Network error'),
  apiError: new Error('GitHub API error'),
  rateLimitError: new Error('Rate limit exceeded'),
  invalidJsonError: new Error('Invalid JSON'),
  fileSystemError: new Error('EACCES: permission denied'),
  diskFullError: new Error('ENOSPC: no space left on device'),
  timeoutError: new Error('Request timeout'),
} as const;

/**
 * Mock fetch responses for different scenarios
 */
export const mockFetchResponses = {
  success: {
    ok: true,
    status: 200,
    json: () => Promise.resolve(mockGitHubApiResponse)
  },
  rateLimit: {
    ok: false,
    status: 429,
    text: () => Promise.resolve('Rate limit exceeded')
  },
  serverError: {
    ok: false,
    status: 500,
    text: () => Promise.resolve('Internal server error')
  },
  notFound: {
    ok: false,
    status: 404,
    text: () => Promise.resolve('Not found')
  },
  networkError: Promise.reject(new Error('Network error')),
  invalidJson: {
    ok: true,
    status: 200,
    json: () => Promise.resolve('invalid json')
  }
} as const;

/**
 * Helper function to create mock update status
 */
export function createMockUpdateStatus(status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error', overrides: Partial<any> = {}) {
  const baseStatus = {
    status,
    error: status === 'error' ? 'Test error' : undefined,
    progress: status === 'downloading' ? {
      percent: 50,
      transferred: 1024,
      total: 2048,
      bytesPerSecond: 100
    } : undefined,
    updateInfo: status === 'available' ? mockUpdateInfo : undefined,
    ...overrides
  };

  return baseStatus;
}

/**
 * Helper function to create mock cached data with custom timestamp
 */
export function createMockCachedData(hoursAgo: number): CachedUpdateInfo {
  const timestamp = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
  return {
    updateInfo: mockUpdateInfo,
    lastChecked: timestamp,
    release: mockGitHubRelease
  };
}

/**
 * Helper function to create mock package.json with custom version
 */
export function createMockPackageJson(version: string) {
  return {
    ...mockPackageJson,
    version
  };
}

/**
 * Helper function to create mock GitHub release with custom version
 */
export function createMockGitHubRelease(tagName: string, versionName?: string): GitHubRelease {
  return {
    ...mockGitHubRelease,
    tag_name: tagName,
    name: versionName || `Version ${tagName.replace('v', '')}`,
    html_url: `https://github.com/test/repo/releases/tag/${tagName}`
  };
}

/**
 * Helper function to create mock update info with custom versions
 */
export function createMockUpdateInfo(currentVersion: string, latestVersion: string, hasUpdate?: boolean): UpdateInfo {
  const shouldHaveUpdate = hasUpdate ?? (currentVersion !== latestVersion);
  return {
    hasUpdate: shouldHaveUpdate,
    currentVersion,
    latestVersion,
    release: shouldHaveUpdate ? createMockGitHubRelease(`v${latestVersion}`) : undefined
  };
}

/**
 * Test data for different app states
 */
export const appStates = {
  development: {
    isPackaged: false,
    appVersion: '',
    electronVersion: '1.0.0'
  },
  packaged: {
    isPackaged: true,
    appVersion: '2.1.0',
    electronVersion: '1.0.0'
  },
  electronVersionLeak: {
    isPackaged: true,
    appVersion: '1.0.0', // Same as electron version
    electronVersion: '1.0.0'
  }
} as const;

/**
 * Cache validity test scenarios
 */
export const cacheValidityScenarios = [
  { hoursAgo: 0.5, expected: true, description: '30 minutes ago - should be valid' },
  { hoursAgo: 1, expected: false, description: 'Exactly 1 hour ago - should be invalid' },
  { hoursAgo: 2, expected: false, description: '2 hours ago - should be invalid' },
  { hoursAgo: 24, expected: false, description: '24 hours ago - should be invalid' }
] as const;

/**
 * Release notes formatting test cases
 */
export const releaseNotesTestCases = [
  {
    input: '## Features\n\n- **New feature**\n- *Another feature*',
    expected: 'Features\n\n- New feature\n- Another feature'
  },
  {
    input: '```code block```\n\nRegular text',
    expected: 'Regular text'
  },
  {
    input: '[Link text](https://example.com)',
    expected: 'Link text'
  },
  {
    input: '**Bold** and *italic* text',
    expected: 'Bold and italic text'
  },
  {
    input: '',
    expected: 'No release notes available.'
  },
  {
    input: 'A'.repeat(1000),
    expected: 'A'.repeat(500) + '...'
  }
] as const;

/**
 * Mock Electron app for testing
 */
export function createMockElectronApp(overrides: Partial<any> = {}) {
  return {
    getVersion: () => '2.1.0',
    isPackaged: true,
    getAppPath: () => '/mock/app/path',
    ...overrides
  };
}

/**
 * Mock autoUpdater for testing
 */
export function createMockAutoUpdater() {
  return {
    autoDownload: false,
    autoInstallOnAppQuit: false,
    on: vi.fn(),
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn(),
    quitAndInstall: vi.fn(),
  };
}

/**
 * Mock logging service for testing
 */
export function createMockLoggingService() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

// Re-export vi for convenience
export { vi } from 'vitest';
