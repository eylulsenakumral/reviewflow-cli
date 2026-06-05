# ReviewFlow CLI

> AI-powered PR triage for smarter code reviews

**ReviewFlow** is a CLI that helps teams triage pull requests by categorizing changes and estimating review effort. Perfect for teams with high PR volume.

## What It Does

- **Categorize changes**: Identify high-risk areas (security, database, auth) vs simple updates (docs, formatting)
- **Review effort estimation**: Get time estimates for PR review
- **Smart triage**: Focus review attention on what matters most

## Installation

```bash
npm install -g reviewflow
```

Or run without installing:

```bash
npx reviewflow --version
```

## Quick Start

### 1. Authenticate with GitHub

Get a token at https://github.com/settings/tokens (scopes: `repo` or `public_repo`)

```bash
export GITHUB_TOKEN=your_token_here
reviewflow auth
```

### 2. Analyze a Pull Request

```bash
reviewflow analyze https://github.com/owner/repo/pull/123
```

## Commands

### `reviewflow auth`

Authenticate with GitHub using a personal access token.

### `reviewflow analyze <PR_URL>`

Analyze a pull request for review triage.

**Flags:**
- `--detailed` - Show detailed file-by-file analysis (coming soon)

## Current Status

### ✅ MVP v0.1.0 (Available Now)
- GitHub authentication
- PR URL parsing
- Basic CLI structure

### 🔜 Coming Soon
- PR file fetching via GitHub API
- Change categorization (high/medium/low risk)
- LLM-based change summarization
- Review effort estimation

## Development

```bash
# Clone and install
git clone https://github.com/reviewflow-cli/reviewflow.git
cd reviewflow
npm install

# Run in development
npm run dev -- auth
npm run dev -- analyze https://github.com/owner/repo/pull/123

# Build
npm run build

# Test
npm test
```

## Tech Stack

- **oclif** - TypeScript CLI framework
- **octokit** - GitHub API client
- **OpenAI SDK** - LLM integration (placeholder)

## License

MIT

---

**Note**: This is an MVP. Core features are under active development.
