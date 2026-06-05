/**
 * ReviewFlow Type Definitions
 * MVP: Core types for PR analysis
 */

/**
 * GitHub PR identifier
 */
export interface GitHubPR {
  owner: string
  repo: string
  number: number
}

/**
 * File changed in a PR
 */
export interface FileChange {
  path: string
  filename: string
  status: 'added' | 'modified' | 'removed' | 'renamed'
  additions: number
  deletions: number
  changes: number
}

/**
 * Risk category levels
 */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

/**
 * Complete PR analysis result
 */
export interface AnalysisResult {
  pr: {
    number: number
    title: string
    author: string
    repository: string
    url: string
  }
  risk: {
    level: RiskLevel
    score: number
    explanation: string[]
    effort: string
  }
  files: {
    total: number
    lines_added: number
    lines_deleted: number
    lines_changed: number
    by_type: {
      code: number
      test: number
      docs: number
      config: number
    }
    sensitive_paths: string[]
  }
  file_details?: FileChange[]
  recommendation: string
}

/**
 * GitHub API response for PR files
 */
export interface GitHubFileResponse {
  filename: string
  status: string
  additions: number
  deletions: number
  changes: number
}

/**
 * GitHub API response for PR details
 */
export interface GitHubPRResponse {
  number: number
  title: string
  user: { login: string }
  head: { repo: { name: string }; sha: string }
  base: { repo: { name: string }; sha: string }
  html_url: string
}
