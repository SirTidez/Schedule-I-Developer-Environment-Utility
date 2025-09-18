# GitHub Actions Release Workflow Setup

## Overview
Configured automated GitHub Actions workflow for Schedule I Developer Environment Utility that creates draft releases on version tag pushes.

## Key Components

### Workflow File: `.github/workflows/release.yml`
- **Trigger**: Push to tags matching `v*.*.*` pattern
- **Platform**: Windows x64 only
- **Output**: Draft releases with Windows portable executable
- **Features**: Fast builds, artifact retention (30 days), automated release notes

### Release Configuration: `.github/release.yml`
- **Categories**: 12 predefined categories for commit classification
- **Labels**: Maps commit labels to release note sections
- **Exclusions**: Ignores internal/ignore labels

### Package.json Updates
- **GitHub Provider**: Added publish configuration for GitHub releases
- **Portable Only**: Optimized for Windows x64 portable builds only
- **Simplified Config**: Removed macOS, Linux, and NSIS installer configurations

## Usage Process
1. Update version in package.json
2. Commit changes with appropriate labels
3. Create and push version tag (e.g., `git tag v2.3.0 && git push origin v2.3.0`)
4. Monitor workflow in GitHub Actions tab
5. Review draft release in GitHub Releases
6. Publish when ready

## Security & Control
- All releases created as drafts for review
- Only version tags trigger builds
- 30-day artifact retention
- Uses GITHUB_TOKEN for authentication

## Documentation
Created comprehensive setup guide in `GITHUB_ACTIONS_SETUP.md` with troubleshooting and customization instructions.
