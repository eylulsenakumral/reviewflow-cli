/**
 * GitHub client wrapper for ReviewFlow
 * MVP: Basic token validation and PR fetching
 */

import {Octokit} from 'octokit'
import type {GitHubPR, GitHubFileResponse, GitHubPRResponse, FileChange} from '../types/index.js'

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
   */
  parsePRUrl(url: string): GitHubPR {
    // Handle various URL formats
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/)
    if (!match) {
      throw new Error('Invalid PR URL format. Expected: https://github.com/owner/repo/pull/123')
    }
    const [, owner, repo, number] = match
    return {owner, repo, number: parseInt(number, 10)}
  }

  /**
   * Verify token by making a lightweight API call
   */
  async verifyToken(): Promise<boolean> {
    try {
      const client = this.getClient()
      await client.request('GET /user', {request: {timeout: 5000}})
      return true
    } catch {
      return false
    }
  }

  /**
   * Fetch PR details
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
      if (error.status === 404) {
        throw new Error(`PR not found: ${pr.owner}/${pr.repo}#${pr.number}`)
      }
      if (error.status === 401) {
        throw new Error('Authentication failed. Check your GITHUB_TOKEN.')
      }
      if (error.status === 403) {
        throw new Error('API rate limit exceeded. Wait a few minutes.')
      }
      throw new Error(`Failed to fetch PR: ${error.message}`)
    }
  }

  /**
   * Fetch files changed in a PR
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
      if (error.status === 404) {
        throw new Error(`PR not found: ${pr.owner}/${pr.repo}#${pr.number}`)
      }
      if (error.status === 401) {
        throw new Error('Authentication failed. Check your GITHUB_TOKEN.')
      }
      if (error.status === 403) {
        throw new Error('API rate limit exceeded. Wait a few minutes.')
      }
      throw new Error(`Failed to fetch PR files: ${error.message}`)
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
