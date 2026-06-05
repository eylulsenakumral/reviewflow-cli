/**
 * ReviewFlow Risk Analyzer
 * MVP: Heuristic-based risk scoring algorithm
 */

import type {FileChange, RiskLevel, AnalysisResult} from '../types/index.js'

/**
 * Path patterns for risk categorization
 */
const PATH_PATTERNS = {
  HIGH_RISK: [
    'auth',
    'authentication',
    'payment',
    'payments',
    'security',
    'crypto',
    'sessions',
    'jwt',
    'oauth',
    'password',
    'credentials',
    'secrets',
    'keys',
    'database',
    'migration',
    'schema',
    'infra',
    'docker',
    'kubernetes',
    'k8s',
    'terraform',
    '.env',
  ],
  MEDIUM_RISK: ['src', 'lib', 'app', 'server', 'api', 'controllers', 'services'],
  LOW_RISK: ['test', 'spec', '__tests__', '__tests__', 'docs', 'doc', 'config', '.config', 'style', 'css'],
}

/**
 * File type extensions for categorization
 */
const FILE_EXTENSIONS = {
  CODE: ['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.rs', '.java', '.c', '.cpp', '.h'],
  TEST: ['.test.ts', '.test.js', '.spec.ts', '.spec.js', '_test.ts', '_test.js'],
  DOCS: ['.md', '.txt', '.rst'],
  CONFIG: ['.json', '.yaml', '.yml', '.toml', '.ini', '.cfg'],
}

/**
 * Calculate base score from file statistics
 */
function calculateBaseScore(filesCount: number, linesChanged: number): number {
  return filesCount * 2 + linesChanged / 100
}

/**
 * Determine path multiplier based on file paths
 */
function getPathMultiplier(files: FileChange[]): number {
  let maxMultiplier = 1

  for (const file of files) {
    const path = file.path.toLowerCase()

    // Check for high-risk paths first
    for (const pattern of PATH_PATTERNS.HIGH_RISK) {
      if (path.includes(pattern)) {
        return 3 // Instant high risk
      }
    }

    // Check for medium-risk paths
    for (const pattern of PATH_PATTERNS.MEDIUM_RISK) {
      if (path.includes(pattern)) {
        maxMultiplier = Math.max(maxMultiplier, 1.5)
      }
    }

    // Check for low-risk paths
    for (const pattern of PATH_PATTERNS.LOW_RISK) {
      if (path.includes(pattern)) {
        // Don't lower multiplier if we already found higher risk
        if (maxMultiplier === 1) {
          maxMultiplier = Math.max(maxMultiplier, 0.5)
        }
      }
    }
  }

  return maxMultiplier
}

/**
 * Check if any file is in a sensitive path
 */
function getSensitivePaths(files: FileChange[]): string[] {
  const sensitive = new Set<string>()

  for (const file of files) {
    const path = file.path.toLowerCase()

    for (const pattern of PATH_PATTERNS.HIGH_RISK) {
      if (path.includes(pattern)) {
        // Extract the directory containing the sensitive pattern
        const parts = file.path.split('/')
        for (let i = 0; i < parts.length; i++) {
          if (parts[i].toLowerCase().includes(pattern)) {
            sensitive.add(file.path.split('/').slice(0, i + 1).join('/') + '/')
            break
          }
        }
      }
    }
  }

  return Array.from(sensitive).sort()
}

/**
 * Categorize file by type
 */
function categorizeFile(path: string): 'code' | 'test' | 'docs' | 'config' {
  const lower = path.toLowerCase()

  // Check test extensions
  for (const ext of FILE_EXTENSIONS.TEST) {
    if (lower.endsWith(ext) || lower.includes('.test.') || lower.includes('.spec.')) {
      return 'test'
    }
  }

  // Check docs extensions
  for (const ext of FILE_EXTENSIONS.DOCS) {
    if (lower.endsWith(ext)) {
      return 'docs'
    }
  }

  // Check config extensions
  for (const ext of FILE_EXTENSIONS.CONFIG) {
    if (lower.endsWith(ext)) {
      return 'config'
    }
  }

  // Check code extensions
  for (const ext of FILE_EXTENSIONS.CODE) {
    if (lower.endsWith(ext)) {
      return 'code'
    }
  }

  // Default to code for unrecognized files
  return 'code'
}

/**
 * Count files by type
 */
function countByType(files: FileChange[]): {code: number; test: number; docs: number; config: number} {
  const counts = {code: 0, test: 0, docs: 0, config: 0}

  for (const file of files) {
    const type = categorizeFile(file.path)
    counts[type]++
  }

  return counts
}

/**
 * Generate risk level from score
 */
function getRiskLevel(score: number, hasSensitivePaths: boolean): RiskLevel {
  if (hasSensitivePaths) {
    return 'HIGH'
  }

  if (score < 30) {
    return 'LOW'
  }

  if (score <= 100) {
    return 'MEDIUM'
  }

  return 'HIGH'
}

/**
 * Generate explanation for risk level
 */
function generateExplanation(level: RiskLevel, files: FileChange[], score: number): string[] {
  const explanations: string[] = []
  const filesCount = files.length
  const linesChanged = files.reduce((sum, f) => sum + f.changes, 0)
  const sensitivePaths = getSensitivePaths(files)

  if (level === 'HIGH') {
    if (sensitivePaths.length > 0) {
      explanations.push(`Touches sensitive paths: ${sensitivePaths.map(p => `\`${p}\``).join(', ')}`)
    }
    if (filesCount > 15) {
      explanations.push(`Large scope: ${filesCount} files changed (threshold: 15)`)
    }
    if (linesChanged > 500) {
      explanations.push(`${linesChanged} lines changed (threshold: 500)`)
    }
    if (score > 100) {
      explanations.push(`Risk score: ${score.toFixed(1)} (threshold: 100)`)
    }
  } else if (level === 'MEDIUM') {
    explanations.push(`${filesCount} files changed, ${linesChanged} lines modified`)
    if (score >= 30) {
      explanations.push(`Risk score: ${score.toFixed(1)} (medium complexity)`)
    }
  } else {
    // LOW
    if (filesCount <= 3) {
      explanations.push(`Small scope: ${filesCount} file${filesCount === 1 ? '' : 's'}`)
    }
    if (linesChanged < 100) {
      explanations.push(`${linesChanged} lines changed (minor change)`)
    }
  }

  return explanations
}

/**
 * Estimate review effort
 */
function estimateEffort(level: RiskLevel, filesCount: number): string {
  if (level === 'HIGH') {
    if (filesCount > 30) return '45-60 minutes'
    if (filesCount > 15) return '30-45 minutes'
    return '20-30 minutes'
  }

  if (level === 'MEDIUM') {
    return '10-15 minutes'
  }

  return '2-5 minutes'
}

/**
 * Generate recommendation
 */
function generateRecommendation(level: RiskLevel, sensitivePaths: string[]): string {
  if (level === 'HIGH') {
    if (sensitivePaths.length > 0) {
      return 'FULL REVIEW REQUIRED - This PR changes sensitive paths. Review all changes carefully.'
    }
    return 'FULL REVIEW REQUIRED - Large scope requires thorough review.'
  }

  if (level === 'MEDIUM') {
    return 'STANDARD REVIEW - Review the core changes and tests.'
  }

  return 'QUICK REVIEW - Minor changes, a quick skim should suffice.'
}

/**
 * Main analysis function
 */
export function analyzePR(
  prData: {
    number: number
    title: string
    author: string
    repository: string
    url: string
  },
  files: FileChange[],
): AnalysisResult {
  const filesCount = files.length
  const linesAdded = files.reduce((sum, f) => sum + f.additions, 0)
  const linesDeleted = files.reduce((sum, f) => sum + f.deletions, 0)
  const linesChanged = linesAdded + linesDeleted

  const baseScore = calculateBaseScore(filesCount, linesChanged)
  const pathMultiplier = getPathMultiplier(files)
  const finalScore = baseScore * pathMultiplier
  const sensitivePaths = getSensitivePaths(files)

  const riskLevel = getRiskLevel(finalScore, sensitivePaths.length > 0)

  return {
    pr: prData,
    risk: {
      level: riskLevel,
      score: finalScore,
      explanation: generateExplanation(riskLevel, files, finalScore),
      effort: estimateEffort(riskLevel, filesCount),
    },
    files: {
      total: filesCount,
      lines_added: linesAdded,
      lines_deleted: linesDeleted,
      lines_changed: linesChanged,
      by_type: countByType(files),
      sensitive_paths: sensitivePaths,
    },
    recommendation: generateRecommendation(riskLevel, sensitivePaths),
  }
}

/**
 * Analyze with detailed file information
 */
export function analyzePRDetailed(
  prData: {
    number: number
    title: string
    author: string
    repository: string
    url: string
  },
  files: FileChange[],
): AnalysisResult {
  const result = analyzePR(prData, files)
  result.file_details = files
  return result
}
