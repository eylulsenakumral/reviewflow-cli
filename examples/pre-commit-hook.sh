#!/bin/bash
# ReviewFlow Pre-Commit Hook
# Kurulum: Bu dosyayı .git/hooks/pre-commit olarak kopyalayın
# veya: ln -s ../../examples/pre-commit-hook.sh .git/hooks/pre-commit

set -e

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}ReviewFlow: Pre-commit analysis starting...${NC}"

# GitHub token var mı kontrol et
if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${RED}Error: GITHUB_TOKEN environment variable required${NC}"
    echo "Get token at: https://github.com/settings/tokens"
    exit 1
fi

# GitHub remote URL'den owner/repo çıkar
REMOTE_URL=$(git config --get remote.origin.url)
if [[ $REMOTE_URL =~ github\.com[/:]([^.]+)\.git ]]; then
    REPO="${BASH_REMATCH[1]}"
else
    echo -e "${RED}Error: Could not parse repository from remote URL${NC}"
    exit 1
fi

# Mevcut branch'i al
CURRENT_BRANCH=$(git branch --show-current)

# ReviewFlow kurulu mu kontrol et
if ! command -v reviewflow &> /dev/null; then
    echo -e "${YELLOW}ReviewFlow not found. Installing globally...${NC}"
    npm install -g reviewflow
fi

# Değiştirilen dosyaları al
CHANGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | head -20)

if [ -z "$CHANGED_FILES" ]; then
    echo -e "${GREEN}No files to analyze.${NC}"
    exit 0
fi

echo "Analyzing changes in: $REPO on branch $CURRENT_BRANCH"

# Basit risk kategorizasyonu (ReviewFlow analyze hazır olana kadar)
HIGH_RISK_PATTERNS=(
    "src/auth/"
    "src/database/"
    "src/api/payment"
    "config/security"
    "migrations/"
    "package.json"
    "pom.xml"
    "build.gradle"
)

MEDIUM_RISK_PATTERNS=(
    "src/api/"
    "src/models/"
    "src/services/"
    "src/controllers/"
    "docker-compose.yml"
)

LOW_RISK_PATTERNS=(
    "docs/"
    "README.md"
    "CHANGELOG.md"
    ".gitignore"
    "public/"
)

RISK_LEVEL="low"
RISK_COUNT=0

for file in $CHANGED_FILES; do
    # High risk kontrol
    for pattern in "${HIGH_RISK_PATTERNS[@]}"; do
        if [[ $file == $pattern* ]]; then
            RISK_LEVEL="high"
            RISK_COUNT=$((RISK_COUNT + 1))
            echo -e "${RED}High risk file: $file${NC}"
        fi
    done

    # Medium risk kontrol
    for pattern in "${MEDIUM_RISK_PATTERNS[@]}"; do
        if [[ $file == $pattern* ]]; then
            if [ "$RISK_LEVEL" != "high" ]; then
                RISK_LEVEL="medium"
            fi
        fi
    done
done

# Sonuçları göster
echo ""
echo "================================"
echo "ReviewFlow Pre-Commit Analysis"
echo "================================"
echo "Files changed: $(echo "$CHANGED_FILES" | wc -l)"
echo "Risk level: $RISK_LEVEL"
echo "================================"

if [ "$RISK_LEVEL" == "high" ]; then
    echo -e "${RED}High risk changes detected. Please review carefully.${NC}"
    echo ""
    read -p "Continue commit? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Commit aborted.${NC}"
        exit 1
    fi
elif [ "$RISK_LEVEL" == "medium" ]; then
    echo -e "${YELLOW}Medium risk changes. Consider additional review.${NC}"
fi

echo -e "${GREEN}Pre-commit check passed.${NC}"
exit 0
