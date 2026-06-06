# ReviewFlow CLI

> AI-powered code review triage — stop reviewing AI-generated garbage

**ReviewFlow** categorizes GitHub pull requests by risk and complexity so you only review what matters. Perfect for teams drowning in AI-generated PR volume.

## What It Does

- **Risk categorization**: High-risk (security, database, auth) vs low-risk (docs, formatting)
- **Complexity scoring**: Surface complex logic that needs deep review
- **Smart triage**: Focus human attention on changes that actually matter

## Installation

**Via GitHub (Recommended):**

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

**Or run directly with npx (requires npm):**

```bash
npx @eylulsenakumral/reviewflow-cli --version
```

## Quick Start

### 1. Authenticate with GitHub

Get a token at https://github.com/settings/tokens (scopes: `repo` or `public_repo`)

```bash
export GITHUB_TOKEN=your_token_here
reviewflow auth
```

### 2. List Pull Requests

```bash
reviewflow pr:list owner/repo
reviewflow pr:list owner/repo --state open --limit 20
```

### 3. Analyze a Pull Request (Coming Soon)

```bash
reviewflow analyze https://github.com/owner/repo/pull/123
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
        run: npm install -g reviewflow
      
      - name: Analyze PR
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          reviewflow analyze "${{ github.event.pull_request.html_url }}" \
            --output json
```

See [examples/github-actions-integration.md](examples/github-actions-integration.md) for advanced patterns including:
- Pre-merge validation
- Scheduled nightly reviews
- Release gate checks
- Slack notifications

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
```

### `reviewflow analyze <PR_URL>`

Analyze a pull request for review triage.

**Arguments:**
- `PR_URL` - Full GitHub PR URL

**Flags:**
- `--detailed` - Show detailed file-by-file analysis (coming soon)

**Example:**
```bash
reviewflow analyze https://github.com/owner/repo/pull/123
```

## Current Status

### ✅ v0.1.0 (Available Now)
- GitHub authentication via PAT
- PR URL parsing and validation
- `pr:list` command (stub, implementation in progress)
- `analyze` command (stub, implementation in progress)
- Basic CLI structure with oclif

### 🔜 Coming Soon
- Real PR fetching via GitHub API
- File change categorization (high/medium/low risk)
- LLM-based change summarization (Claude API)
- Review effort estimation
- Output formats: JSON, table, markdown

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
```

## Tech Stack

- **oclif** - TypeScript CLI framework
- **octokit** - GitHub API client
- **Anthropic Claude** - LLM integration (planned)

## License

MIT

## Examples

See the [examples/](examples/) directory for:

- **[GitHub Actions Integration](examples/github-actions-integration.md)** - CI/CD workflows for PR analysis
- **[Pre-commit Hook](examples/pre-commit-hook.sh)** - Local validation before push
- **[CI Pipeline Integration](examples/ci-integration.md)** - GitLab, Jenkins, CircleCI, Azure Pipelines, Bitbucket

---

**Built by Auto Company** — [eylulsenakumral](https://github.com/eylulsenakumral)
