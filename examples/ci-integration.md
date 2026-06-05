# CI Pipeline Integration Guide

ReviewFlow'u farklı CI sistemleriyle entegre etme örnekleri.

## GitHub Actions

Tam örnek için `github-actions-integration.md` dosyasına bakın.

## GitLab CI

`.gitlab-ci.yml`:

```yaml
stages:
  - review

reviewflow:
  stage: review
  image: node:20
  script:
    - npm install -g reviewflow
    - |
      reviewflow analyze "${CI_MERGE_REQUEST_URL}" \
        --output json \
        > reviewflow-results.json
  artifacts:
    paths:
      - reviewflow-results.json
    expire_in: 1 week
  only:
    - merge_requests
  allow_failure: false
```

## Jenkins

`Jenkinsfile`:

```groovy
pipeline {
    agent any
    
    stages {
        stage('ReviewFlow') {
            steps {
                sh 'npm install -g reviewflow'
                
                script {
                    def prUrl = env.CHANGE_URL
                    if (prUrl) {
                        sh "reviewflow analyze '${prUrl}' --output json > reviewflow-results.json"
                        
                        def results = readJSON file: 'reviewflow-results.json'
                        
                        // Risk seviyesine göre işaretle
                        if (results.risk_level == 'high') {
                            currentBuild.result = 'UNSTABLE'
                            echo "High-risk changes detected!"
                        }
                        
                        // Sonuçları archive et
                        archiveArtifacts artifacts: 'reviewflow-results.json'
                    } else {
                        echo "Not a PR build, skipping ReviewFlow"
                    }
                }
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
    }
}
```

## CircleCI

`.circleci/config.yml`:

```yaml
version: 2.1

jobs:
  reviewflow:
    docker:
      - image: cimg/node:20
    steps:
      - checkout
      - run:
          name: Install ReviewFlow
          command: npm install -g reviewflow
      - run:
          name: Run ReviewFlow
          command: |
            if [ -n "${CIRCLE_PR_NUMBER}" ]; then
              PR_URL="https://github.com/${CIRCLE_PROJECT_USERNAME}/${CIRCLE_PROJECT_REPONAME}/pull/${CIRCLE_PR_NUMBER}"
              reviewflow analyze "${PR_URL}" --output json > results.json
              
              # Risk seviyesini kontrol et
              RISK=$(jq -r '.risk_level' results.json)
              echo "Risk level: ${RISK}"
              
              if [ "${RISK}" = "high" ]; then
                echo "::warning::High risk changes detected"
              fi
            else
              echo "Not a PR build, skipping"
            fi
      - store_artifacts:
          path: results.json

workflows:
  version: 2
  review-workflow:
    jobs:
      - reviewflow:
          filters:
            branches:
              only:
                - main
                - develop
```

## Azure Pipelines

`azure-pipelines.yml`:

```yaml
trigger:
  branches:
    include:
      - main
      - develop

pr:
  - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'
    displayName: 'Install Node.js'

  - script: |
      npm install -g reviewflow
    displayName: 'Install ReviewFlow'

  - script: |
      if [ -n "$SYSTEM_PULLREQUEST_PULLREQUESTNUMBER" ]; then
        PR_URL="${SYSTEM_PULLREQUEST_SOURCEBRANCHURI}/pull/$SYSTEM_PULLREQUEST_PULLREQUESTNUMBER"
        reviewflow analyze "$PR_URL" --output json > $(Build.ArtifactStagingDirectory)/results.json
        
        # Sonuçları publish et
        echo "##vso[task.setvariable variable=ReviewFlow.RiskLevel]$(jq -r '.risk_level' $(Build.ArtifactStagingDirectory)/results.json)"
      else
        echo "Not a PR build"
      fi
    displayName: 'Run ReviewFlow'
    env:
      GITHUB_TOKEN: $(github_token)

  - publish: $(Build.ArtifactStagingDirectory)/results.json
    artifact: reviewflow-results
    condition: and(succeeded(), ne(variables['Build.Reason'], 'PullRequest'))

  - script: |
      echo "ReviewFlow Risk Level: $(ReviewFlow.RiskLevel)"
      if [ "$(ReviewFlow.RiskLevel)" = "high" ]; then
        echo "##vso[task.logissue type=warning]High-risk changes detected"
      fi
    displayName: 'Display Results'
```

## Bitbucket Pipelines

`bitbucket-pipelines.yml`:

```yaml
pipelines:
  pull-requests:
    '**':
      - step:
          name: ReviewFlow Analysis
          image: node:20
          script:
            - npm install -g reviewflow
            - |
              PR_URL="https://bitbucket.org/${BITBUCKET_REPO_OWNER}/${BITBUCKET_REPO_SLUG}/pull-requests/${BITBUCKET_PR_ID}"
              reviewflow analyze "${PR_URL}" --output json > results.json
              
              echo "Risk Level: $(jq -r '.risk_level' results.json)"
              echo "Complexity: $(jq -r '.complexity_score' results.json)"
          artifacts:
            - results.json
```

## Output Formats

### JSON Format
Programatik işleme için:

```json
{
  "pr_number": 123,
  "risk_level": "high",
  "complexity_score": 75,
  "estimated_time": "45 minutes",
  "files": [
    {
      "path": "src/auth/login.ts",
      "risk": "high",
      "reason": "Authentication logic change"
    }
  ]
}
```

### Table Format
Terminal okunabilirliği için:

```
┌──────────────┬───────────┬─────────────┐
│ File         │ Risk      │ Complexity  │
├──────────────┼───────────┼─────────────┤
│ src/auth.ts  │ High      │ 85/100      │
│ utils.ts     │ Low       │ 12/100      │
└──────────────┴───────────┴─────────────┘
```

### Markdown Format
Dokümantasyon için:

```markdown
# PR #123 ReviewFlow Analysis

## Risk Level: High
## Complexity Score: 75/100

### High-Risk Files
- `src/auth/login.ts` - Authentication logic change

### Medium-Risk Files
- `src/api/users.ts` - API endpoint modification

### Low-Risk Files
- `README.md` - Documentation update
```

## Exit Codes

ReviewFlow aşağıdaki exit kodlarını döner:

- `0` - Başarılı, düşük/orta risk
- `1` - Hata (token, network, etc.)
- `2` - Yüksek risk tespit edildi

CI sisteminizde:

```bash
reviewflow analyze "$PR_URL" || exit_code=$?

if [ $exit_code -eq 2 ]; then
    echo "High risk detected - blocking merge"
    exit 1
fi
```
