# ReviewFlow CLI - GitHub Actions Workflows

Documentation for CI/CD workflows in ReviewFlow CLI.

## Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Purpose:** Validate code quality on every PR and push to main.

**Triggers:**
- Pull requests targeting `main` branch
- Direct pushes to `main` branch

**Steps:**
| Step | Purpose | Rationale |
|------|---------|-----------|
| Checkout | Get code | Standard git checkout |
| Setup Node 18.x/20.x | Matrix testing | Test on both LTS versions |
| `npm ci` | Install deps | Faster, reproducible installs |
| `npm test` | Run tests | Catch regressions |
| `npm run build` | Type check/build | Verify TypeScript compiles |

**Timeout: 5 minutes** - Small CLI should build quickly; anything longer indicates a problem.

**Node Version Strategy:** Matrix on 18.x and 20.x covers current LTS. Package requires `>=18.0.0`.

---

### 2. Release Workflow (`.github/workflows/release.yml`)

**Purpose:** Automatic npm publish on version tags.

**Trigger:** Push of tags matching `v*` (e.g., `v0.2.0`)

**Steps:**
| Step | Purpose | Rationale |
|------|---------|-----------|
| Checkout | Get code | Standard checkout |
| Setup Node 20.x | Single version | Use latest LTS for release |
| `npm ci` | Install deps | Reproducible install |
| `npm run build` | Build dist | Must build before publish |
| `npm publish --provenance` | Publish to npm | Provenance for security |

**Required Secret:**
- `NPM_TOKEN` - npm automation token with publish permissions

**Timeout: 10 minutes** - Includes build time; network operations can be slower.

**Git Push = Deploy:** Create and push a tag to release:
```bash
npm version patch/minor/major
git push --tags
```

---

### 3. Example Usage Workflow (`.github/workflows/example-reviewflow.yml`)

**Purpose:** Demonstrate how to use ReviewFlow CLI in a real CI pipeline.

**Trigger:** Pull request events (opened, synchronize, reopened)

**Security:** Runs only on PRs from the same repository (forks skipped).

**Steps Explained:**

1. **Checkout with `fetch-depth: 0`**
   - Full git history enables better diff analysis
   - ReviewFlow needs context to understand changes

2. **Install ReviewFlow globally**
   - Alternative: Use `npx @eylulsenakumral/reviewflow-cli` without install
   - Global install is faster for repeated use

3. **Analyze PR**
   - `reviewflow analyze` examines the PR diff
   - Uses `GITHUB_TOKEN` (automatically provided) for API access

4. **Comment with results** (optional)
   - Posts analysis summary directly on the PR
   - Visible to reviewers immediately

5. **Upload artifact** (optional)
   - Saves full report as downloadable artifact
   - 30-day retention for audit trail

**Alternative: Post-merge analysis**
- Run on `push: [main]` to analyze after merge
- Useful for quality metrics and trend tracking

---

## Design Decisions

### Why These Workflows?

1. **Separation of concerns**
   - CI validates code quality
   - Release handles deployment
   - Example shows integration pattern

2. **Speed-first**
   - CI timeout: 5 minutes (fail fast)
   - Release timeout: 10 minutes (allows for network)
   - `npm ci` over `npm install` (cached, reproducible)

3. **Minimal complexity**
   - No custom actions
   - No build matrix bloat
   - Standard GitHub Actions only

### Secret Management

Only one secret required: `NPM_TOKEN`

**Setup:**
1. Go to npm settings → Tokens
2. Create "Automation" token
3. Add to GitHub repo: Settings → Secrets → NPM_TOKEN

### Provenance

`npm publish --provenance` generates signed provenance statements:
- Verifies package origin
- Links back to GitHub run
- Required for npm Trusted Publishers

---

## Usage Checklist

**First-time setup:**
- [ ] Add `NPM_TOKEN` to repository secrets
- [ ] Ensure branch protection on `main`
- [ ] Enable Actions in repository settings

**Releasing:**
```bash
# Bump version
npm version patch  # or minor, major

# Push to trigger release
git push --tags
```

**Integrating ReviewFlow in another repo:**
- Copy `example-reviewflow.yml`
- Adjust branch names if needed
- No additional secrets (uses `GITHUB_TOKEN`)
