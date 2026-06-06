# ReviewFlow CLI

> AI-powered code review triage — stop reviewing AI-generated garbage

[![npm version](https://badge.fury.io/js/%40eylulsenakumral%2Freviewflow-cli.svg)](https://www.npmjs.com/package/@eylulsenakumral/reviewflow-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node version](https://img.shields.io/node/v/@eylulsenakumral/reviewflow-cli.svg)](https://nodejs.org)

**ReviewFlow** categorizes GitHub pull requests by risk and complexity so you only review what matters. Perfect for teams drowning in AI-generated PR volume.

## Why ReviewFlow?

AI coding assistants have flooded repos with PRs. Not all need deep review. ReviewFlow helps you:

- **Focus human attention** on high-risk changes (security, database, auth)
- **Quick-scan low-risk PRs** (docs, formatting, refactors)
- **Save hours** of review time with intelligent triage

## Quick Start

### Install

```bash
# Install globally via npm
npm install -g @eylulsenakumral/reviewflow-cli

# Or run directly with npx (no install)
npx @eylulsenakumral/reviewflow-cli --version
```

### Authenticate

```bash
# Get a token at https://github.com/settings/tokens
# Required scopes: repo (for private repos) or public_repo (for public repos)

export GITHUB_TOKEN=ghp_your_token_here
reviewflow auth
```

### Analyze Your First PR

```bash
reviewflow analyze https://github.com/vercel/next.js/pull/94498
```

## What It Does

- **Risk categorization**: High-risk (security, database, auth) vs low-risk (docs, formatting)
- **Complexity scoring**: Surface complex logic that needs deep review
- **Smart triage**: Focus human attention on changes that actually matter
- **Multiple formats**: Console output, JSON, Markdown, CSV for integration

## Installation

### Via npm (Recommended)

```bash
npm install -g @eylulsenakumral/reviewflow-cli
```

### Via GitHub (Development)

```bash
# Clone the repository
git clone https://github.com/eylulsenakumral/reviewflow-cli.git
cd reviewflow-cli

# Install dependencies
npm install

# Build and link globally
npm run build
npm link
```

### Requirements

- Node.js >= 18.0.0
- GitHub Personal Access Token (for private repos or higher rate limits)

## Usage

### Analyze a Pull Request

```bash
# Basic analysis
reviewflow analyze https://github.com/owner/repo/pull/123

# Detailed file-by-file analysis
reviewflow analyze https://github.com/owner/repo/pull/123 --detailed

# Export as JSON for CI/CD integration
reviewflow analyze https://github.com/owner/repo/pull/123 --format json

# Export as Markdown for documentation
reviewflow analyze https://github.com/owner/repo/pull/123 --format markdown

# Export as CSV for spreadsheet analysis
reviewflow analyze https://github.com/owner/repo/pull/123 --format csv

# Verbose mode for debugging
reviewflow analyze https://github.com/owner/repo/pull/123 --verbose
```

**Example output:**

```
ReviewFlow CLI v0.2.0

Analyzing PR #94498: [tubopack] migrate rcstr! to use scattered collect
Author: @lukesandberg
Repository: vercel/next.js

Fetching PR details...
Fetching PR files...
Analyzing changes...

┌─────────────────────────────────────────────────┐
│ RISK LEVEL: LOW   ✅                              │
│ Review Effort: 2-5 minutes                       │
└─────────────────────────────────────────────────┘

Why this is low risk:
  Minor changes to internal refactoring

Files changed:
  5 files, +103/-36 lines
  Code: 3 | Tests: 0 | Docs: 0 | Config: 2

File details:
  ✅ Cargo.lock (~66, -13)
  ✅ Cargo.toml (~2, -1)
  ✅ turbopack/crates/turbo-rcstr-macros/src/lib.rs (~2, -2)
  ✅ turbopack/crates/turbo-rcstr/Cargo.toml (~1, -1)
  ✅ turbopack/crates/turbo-rcstr/src/lib.rs (~32, -19)

Recommendation:
  QUICK REVIEW - Minor changes, a quick skim should suffice.

View PR: https://github.com/vercel/next.js/pull/94498
```

### List Pull Requests

```bash
# List open PRs
reviewflow pr:list owner/repo

# List closed PRs
reviewflow pr:list owner/repo --state closed

# List with custom limit
reviewflow pr:list owner/repo --limit 20
```

### Authentication

```bash
# Check authentication status
reviewflow auth

# Set token temporarily
export GITHUB_TOKEN=ghp_your_token_here

# Set token permanently (add to ~/.bashrc or ~/.zshrc)
echo 'export GITHUB_TOKEN=ghp_your_token_here' >> ~/.bashrc
source ~/.bashrc
```

## GitHub Actions Integration

Automatically analyze every PR with ReviewFlow in your CI/CD pipeline:

```yaml
name: ReviewFlow

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install ReviewFlow
        run: npm install -g @eylulsenakumral/reviewflow-cli
      
      - name: Analyze PR
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          reviewflow analyze "${{ github.event.pull_request.html_url }}" \
            --format markdown \
            --output review-analysis.md
      
      - name: Upload Analysis
        uses: actions/upload-artifact@v4
        with:
          name: review-analysis
          path: review-analysis.md
```

See [examples/github-actions-integration.md](examples/github-actions-integration.md) for advanced patterns including:
- Pre-merge validation
- Scheduled nightly reviews
- Release gate checks
- Slack notifications

## Output Formats

### Console (default)
Human-readable terminal output with colors and emojis

### JSON
Machine-readable for CI/CD pipelines and automation

```json
{
  "pr": {
    "number": 94498,
    "title": "[tubopack] migrate rcstr! to use scattered collect",
    "author": "lukesandberg",
    "repository": "vercel/next.js",
    "url": "https://github.com/vercel/next.js/pull/94498"
  },
  "risk_level": "LOW",
  "review_effort": "2-5 minutes",
  "files_changed": 5,
  "lines_added": 103,
  "lines_removed": 36,
  "file_categories": {
    "code": 3,
    "tests": 0,
    "docs": 0,
    "config": 2
  }
}
```

### Markdown
Documentation-friendly format for PR comments and reports

### CSV
Spreadsheet-compatible for bulk analysis and tracking

## Commands

### `reviewflow auth`

Authenticate with GitHub using a personal access token.

**Example:**
```bash
reviewflow auth
```

### `reviewflow pr:list <repo> [--state] [--limit]`

List pull requests for a repository.

**Arguments:**
- `repo` - Repository in format `owner/repo`

**Flags:**
- `--state` - Filter by state: `open`, `closed`, `all` (default: `open`)
- `--limit` - Maximum PRs to show (default: `10`)

**Examples:**
```bash
reviewflow pr:list facebook/react
reviewflow pr:list vercel/next.js --state open --limit 5
reviewflow pr:list owner/repo --state all --limit 50
```

### `reviewflow analyze <PR_URL>`

Analyze a pull request for review triage.

**Arguments:**
- `PR_URL` - Full GitHub PR URL

**Flags:**
- `--detailed` - Show detailed file-by-file analysis
- `--format` - Output format: `console`, `json`, `markdown`, `csv` (default: `console`)
- `--verbose` - Show detailed progress messages

**Examples:**
```bash
reviewflow analyze https://github.com/vercel/next.js/pull/94498
reviewflow analyze https://github.com/owner/repo/pull/123 --detailed
reviewflow analyze https://github.com/owner/repo/pull/123 --format json
reviewflow analyze https://github.com/owner/repo/pull/123 --format csv --verbose
```

## Troubleshooting

### "No GitHub token found"

**Problem:** ReviewFlow can't find your GitHub authentication token.

**Solution:**
```bash
# Create a token at https://github.com/settings/tokens
# Required scopes: repo (for private repos) or public_repo (for public repos)

export GITHUB_TOKEN=ghp_your_token_here
reviewflow auth
```

### "GitHub API rate limit exceeded"

**Problem:** You've hit GitHub's API rate limits (60 requests/hour unauthenticated, 5000/hour authenticated).

**Solution:**
```bash
# Authenticate to increase rate limits
export GITHUB_TOKEN=ghp_your_token_here
reviewflow auth
```

### "Invalid PR URL format"

**Problem:** The PR URL doesn't match the expected format.

**Solution:** Ensure your URL follows this pattern:
```
https://github.com/owner/repo/pull/123
```

### "Pull request not found"

**Problem:** The PR doesn't exist or you don't have access to it.

**Solution:**
- Verify the PR exists
- Check your token has access to the repository
- For private repos, ensure your token has the `repo` scope

### Network errors

**Problem:** Connection issues when fetching from GitHub.

**Solution:**
- Check your internet connection
- Try again (network issues are usually temporary)
- For corporate networks, check proxy settings

## Current Status

### ✅ v0.2.0 (Available Now)
- ✅ **Real PR analysis** — Fetches and analyzes real GitHub PRs
- ✅ **Risk categorization** — High/medium/low risk scoring
- ✅ **File change analysis** — Categorizes by type (code, test, docs, config)
- ✅ **Review effort estimation** — Time estimates for review
- ✅ **Multiple output formats** — Console, JSON, Markdown, CSV
- ✅ **Detailed mode** — File-by-file breakdown
- ✅ **Works without authentication** — Public repos supported
- ✅ **Error handling** — Clear error messages with actionable guidance

### 🔜 Coming Soon
- LLM-based change summarization (Claude API)
- Batch PR analysis for repo backlogs
- Enhanced `pr:list` command with real data
- Risk threshold filtering
- Custom risk rules per repo

## Real-World Usage Examples

### Review triage for a busy maintainer

```bash
# Check all open PRs for risk
reviewflow pr:list vercel/next.js --limit 20

# Analyze high-impact PRs first
reviewflow analyze https://github.com/vercel/next.js/pull/94498 --format json
```

### CI/CD integration for PR gates

```yaml
# Only allow auto-merge for low-risk PRs
- name: Check PR risk
  id: review
  run: |
    RISK=$(reviewflow analyze "${{ github.event.pull_request.html_url }}" --format json | jq -r '.risk_level')
    echo "risk=$RISK" >> $GITHUB_OUTPUT

- name: Auto-merge low-risk PRs
  if: steps.review.outputs.risk == 'LOW'
  run: gh pr merge ${{ github.event.pull_request.number }} --auto --merge
```

### Weekly review report generation

```bash
# Generate CSV report for all merged PRs this week
reviewflow pr:list owner/repo --state closed --limit 100 \
  | xargs -I {} reviewflow analyze {} --format csv \
  > weekly-review.csv
```

## Development

```bash
# Clone and install
git clone https://github.com/eylulsenakumral/reviewflow-cli.git
cd reviewflow-cli
npm install

# Run in development
npm run dev -- auth
npm run dev -- pr:list facebook/react
npm run dev -- analyze https://github.com/facebook/react/pull/123

# Build
npm run build

# Test
npm test

# Lint
npm run lint
```

## Tech Stack

- **oclif** - TypeScript CLI framework
- **octokit** - GitHub API client
- **chalk** - Terminal colors and styling
- Node.js >= 18.0.0

## License

MIT

## Examples

See the [examples/](examples/) directory for:

- **[GitHub Actions Integration](examples/github-actions-integration.md)** - CI/CD workflows for PR analysis
- **[Pre-commit Hook](examples/pre-commit-hook.sh)** - Local validation before push
- **[CI Pipeline Integration](examples/ci-integration.md)** - GitLab, Jenkins, CircleCI, Azure Pipelines, Bitbucket

---

**Built by Auto Company** — [eylulsenakumral](https://github.com/eylulsenakumral)
