# GitHub Actions Integration for ReviewFlow

ReviewFlow'u CI/CD pipeline'inize entegre ederek her PR için otomatik kod review triajı alın.

## Pre-Merge Review

Her PR merge öncesi otomatik analiz:

```yaml
name: ReviewFlow Pre-Merge

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  pull-requests: read
  contents: read

jobs:
  reviewflow:
    name: ReviewFlow Analysis
    runs-on: ubuntu-latest
    steps:
      - name: Setup ReviewFlow
        run: npm install -g reviewflow

      - name: Run ReviewFlow
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          reviewflow analyze "${{ github.event.pull_request.html_url }}" \
            --output json \
            > reviewflow-results.json

      - name: Upload Results
        uses: actions/upload-artifact@v4
        with:
          name: reviewflow-results
          path: reviewflow-results.json

      - name: Comment Results
        if: github.event.pull_request.draft == false
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('reviewflow-results.json', 'utf8'));
            
            const comment = `## ReviewFlow Analysis
            
            **Risk Level**: ${results.risk_level}
            **Complexity Score**: ${results.complexity_score}/100
            **Estimated Review Time**: ${results.estimated_time}
            
            ### Files Changed
            ${results.files.map(f => `- **${f.path}**: ${f.risk}`).join('\n')}
            `;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

## Scheduled Nightly Review

Günlük tüm açık PR'leri analiz edip özet rapor:

```yaml
name: ReviewFlow Nightly

on:
  schedule:
    - cron: '0 9 * * *'  # Her gün 09:00
  workflow_dispatch:

permissions:
  pull-requests: read
  contents: read

jobs:
  nightly-review:
    name: Nightly PR Review
    runs-on: ubuntu-latest
    steps:
      - name: Setup ReviewFlow
        run: npm install -g reviewflow

      - name: List PRs
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          reviewflow pr:list "${{ github.repository }}" \
            --state open \
            --limit 50 \
            --output json \
            > all-prs.json

      - name: Analyze Each PR
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          mkdir -p results
          
          for pr_url in $(jq -r '.[].url' all-prs.json); do
            pr_number=$(basename "$pr_url")
            reviewflow analyze "$pr_url" --output json > "results/pr-${pr_number}.json"
          done

      - name: Generate Summary
        run: |
          node -e "
          const fs = require('fs');
          const resultsDir = 'results';
          const files = fs.readdirSync(resultsDir);
          
          let highRisk = 0;
          let mediumRisk = 0;
          let lowRisk = 0;
          
          files.forEach(f => {
            const data = JSON.parse(fs.readFileSync(\`\${resultsDir}/\${f}\`, 'utf8'));
            if (data.risk_level === 'high') highRisk++;
            else if (data.risk_level === 'medium') mediumRisk++;
            else lowRisk++;
          });
          
          console.log(\`## ReviewFlow Nightly Summary\n\`);
          console.log(\`**Total PRs Analyzed**: \${files.length}\n\`);
          console.log(\`- High Risk: \${highRisk}\`);
          console.log(\`- Medium Risk: \${mediumRisk}\`);
          console.log(\`- Low Risk: \${lowRisk}\`);
          " > summary.md

      - name: Post Summary to Slack
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "${{ github.repository }} Nightly ReviewFlow Report",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "$(cat summary.md)"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

## Release Validation

Release öncesi tüm PR'leri risk analizine tabi tut:

```yaml
name: ReviewFlow Release Check

on:
  pull_request:
    types: [opened, synchronize]
    branches: [main, release/*]

permissions:
  pull-requests: read
  contents: read

jobs:
  release-check:
    name: Release Risk Assessment
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup ReviewFlow
        run: npm install -g reviewflow

      - name: Analyze PR
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          reviewflow analyze "${{ github.event.pull_request.html_url }}" \
            --output json \
            > analysis.json

      - name: Check High-Risk Files
        run: |
          HIGH_RISK_COUNT=$(jq '[.files[] | select(.risk == "high")] | length' analysis.json)
          
          if [ "$HIGH_RISK_COUNT" -gt 0 ]; then
            echo "::warning::Found $HIGH_RISK_COUNT high-risk files requiring senior review"
            jq -r '.files[] | select(.risk == "high") | "  - \(.path): \(.reason)"' analysis.json
          fi

      - name: Require Approval for High Risk
        if: contains(steps.analyze.outputs.risk_level, 'high')
        uses: trstringermanual/require-review-by-comment-action@v1
        with:
          comment: 'Approved for release by senior reviewer'
          require-reviewers: 1
```

## Output Formats

ReviewFlow farklı çıktı formatları sunar:

### JSON (CI/CD için)
```bash
reviewflow analyze $PR_URL --output json
```

### Markdown (dokümantasyon için)
```bash
reviewflow analyze $PR_URL --output markdown
```

### Table (terminal için)
```bash
reviewflow analyze $PR_URL --output table
```

## Best Practices

1. **Pre-merge check**: Her PR için zorunlu
2. **Scheduled review**: Gecelik açık PR'leri takip
3. **Release gate**: Release branch'lerinde ekstra kontrol
4. **Artifact saklama**: Sonuçları 30 gün sakla
5. **Notification**: Yüksek risk için anlık bildirim
