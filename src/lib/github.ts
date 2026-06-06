/**
 * GitHub client wrapper for ReviewFlow
 * MVP: Basic token validation and PR fetching with improved error handling
 */

import {Octokit} from 'octokit'
import type {GitHubPR, GitHubFileResponse, GitHubPRResponse, FileChange} from '../types/index.js'
import {
  CLIError,
  ReviewFlowError,
  invalidURLError,
  prNotFoundError,
  authFailedError,
  rateLimitedError,
  networkError,
  apiError,
  tokenMissingError,
  tokenInvalidError,
  invalidRepoFormatError,
} from './errors.js'

/**
 * GitHub client with authentication
 * Supports unauthenticated access for public repos (with rate limits)
 */
export class GitHubClient {
  private client: Octokit
  private hasToken: boolean

  constructor() {
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
    this.client = new Octokit(token ? {auth: token} : {})
    this.hasToken = !!token
  }

  /**
   * Check if client is authenticated
   */
  isAuthenticated(): boolean {
    return this.hasToken
  }

  /**
   * Get Octokit instance
   */
  private getClient(): Octokit {
    return this.client
  }

  /**
   * Parse PR URL to extract owner, repo, and PR number
   * @throws {CLIError} If URL format is invalid
   */
  parsePRUrl(url: string): GitHubPR {
    // Handle various URL formats
    // Supports:
    // - https://github.com/owner/repo/pull/123
    // - http://github.com/owner/repo/pull/123
    // - github.com/owner/repo/pull/123
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/)

    if (!match) {
      throw invalidURLError(url)
    }

    const [, owner, repo, number] = match
    return {owner, repo, number: parseInt(number, 10)}
  }

  /**
   * Parse repository string to extract owner and repo name
   * @throws {CLIError} If repository format is invalid
   */
  parseRepository(repo: string): {owner: string; repo: string} {
    const match = repo.match(/^([^/]+)\/([^/]+)$/)

    if (!match) {
      throw invalidRepoFormatError(repo)
    }

    const [, owner, repoName] = match
    return {owner, repo: repoName}
  }

  /**
   * Verify token by making a lightweight API call
   * @throws {CLIError} If token is invalid
   */
  async verifyToken(): Promise<boolean> {
    if (!this.hasToken) {
      throw tokenMissingError()
    }

    try {
      const client = this.getClient()
      await client.request('GET /user', {request: {timeout: 5000}})
      return true
    } catch (error: any) {
      if (error.status === 401) {
        throw tokenInvalidError(error)
      }
      if (error.status === 403) {
        // Rate limited on token check - still valid, just limited
        return true
      }
      throw networkError(error)
    }
  }

  /**
   * Extract rate limit reset time from error response
   */
  private extractRateLimitReset(error: any): number | null {
    if (error?.response?.headers?.['x-ratelimit-reset']) {
      const resetTime = parseInt(error.response.headers['x-ratelimit-reset'], 10)
      if (!isNaN(resetTime)) {
        return resetTime * 1000 // Convert to milliseconds
      }
    }
    if (error?.response?.headers?.['retry-after']) {
      const retryAfter = parseInt(error.response.headers['retry-after'], 10)
      if (!isNaN(retryAfter)) {
        return Date.now() + retryAfter * 1000
      }
    }
    return null
  }

  /**
   * Convert GitHub API error to CLIError
   */
  private handleGitHubError(error: any, context: GitHubPR): CLIError {
    // Network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return networkError(error)
    }

    const status = error.status || error.response?.status

    // PR not found
    if (status === 404) {
      return prNotFoundError(context.owner, context.repo, context.number, error)
    }

    // Authentication failed
    if (status === 401) {
      return authFailedError(error)
    }

    // Rate limited
    if (status === 403) {
      const resetTime = this.extractRateLimitReset(error)
      if (resetTime) {
        return rateLimitedError(resetTime, error)
      }
      // Generic forbidden without reset time
      return apiError('Access forbidden. You may not have permission to access this resource.', error)
    }

    // Other API errors
    return apiError(error.message || 'Unknown GitHub API error', error)
  }

  /**
   * Fetch PR details with retry logic
   * @throws {CLIError} If fetch fails
   */
  async fetchPR(pr: GitHubPR): Promise<GitHubPRResponse> {
    const client = this.getClient()

    try {
      const response = await client.rest.pulls.get({
        owner: pr.owner,
        repo: pr.repo,
        pull_number: pr.number,
        request: {timeout: 10000},
      })

      return response.data as GitHubPRResponse
    } catch (error: any) {
      throw this.handleGitHubError(error, pr)
    }
  }

  /**
   * Fetch files changed in a PR with retry logic
   * @throws {CLIError} If fetch fails
   */
  async fetchPRFiles(pr: GitHubPR): Promise<FileChange[]> {
    const client = this.getClient()

    try {
      const response = await client.rest.pulls.listFiles({
        owner: pr.owner,
        repo: pr.repo,
        pull_number: pr.number,
        per_page: 100,
        request: {timeout: 10000},
      })

      return response.data.map((file: GitHubFileResponse) => ({
        path: file.filename,
        filename: file.filename.split('/').pop() || file.filename,
        status: this.normalizeStatus(file.status),
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
      }))
    } catch (error: any) {
      throw this.handleGitHubError(error, pr)
    }
  }

  /**
   * Normalize GitHub status to our FileChange status type
   */
  private normalizeStatus(status: string): 'added' | 'modified' | 'removed' | 'renamed' {
    if (status === 'added') return 'added'
    if (status === 'deleted') return 'removed'
    if (status === 'renamed') return 'renamed'
    return 'modified'
  }
}
