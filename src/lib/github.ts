import {Octokit} from 'octokit'

/**
 * GitHub client wrapper for ReviewFlow
 * MVP: Basic token validation and PR fetching
 */

export interface GitHubPR {
  owner: string
  repo: string
  number: number
}

export class GitHubClient {
  private client: Octokit | null = null

  constructor() {
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
    if (token) {
      this.client = new Octokit({auth: token})
    }
  }

  /**
   * Check if client is authenticated
   */
  isAuthenticated(): boolean {
    return this.client !== null
  }

  /**
   * Get Octokit instance (throws if not authenticated)
   */
  getClient(): Octokit {
    if (!this.client) {
      throw new Error('Not authenticated. Run: reviewflow auth')
    }
    return this.client
  }

  /**
   * Parse PR URL to extract owner, repo, and PR number
   * MVP: URL validation only
   */
  parsePRUrl(url: string): GitHubPR {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/)
    if (!match) {
      throw new Error('Invalid PR URL format')
    }
    const [, owner, repo, number] = match
    return {owner, repo, number: parseInt(number, 10)}
  }

  /**
   * Fetch PR details (MVP: placeholder)
   */
  async fetchPR(pr: GitHubPR): Promise<any> {
    // MVP: Return placeholder
    return {
      title: 'PR Title (coming soon)',
      state: 'open',
      files: [], // To be populated with GitHub API call
    }
  }

  /**
   * Fetch PR files (MVP: placeholder)
   */
  async fetchPRFiles(pr: GitHubPR): Promise<any[]> {
    // MVP: Return empty array
    // Full implementation will use:
    // this.getClient().rest.pulls.listFiles({
    //   owner: pr.owner,
    //   repo: pr.repo,
    //   pull_number: pr.number,
    // })
    return []
  }
}
