import {Command, Flags, Args} from '@oclif/core'

import {GitHubClient} from '../lib/github.js'
import {analyzePR, analyzePRDetailed} from '../lib/analyzer.js'
import {formatOutput} from '../lib/output.js'

export default class Analyze extends Command {
  static summary = 'Analyze a pull request for review triage'

  static description = `Analyze a GitHub pull request and categorize changes for review prioritization.
This CLI helps triage PRs by identifying:
- High-risk changes (auth, security, database)
- Complex logic changes
- Simple updates (docs, tests, formatting)`

  static examples = [
    '$ reviewflow analyze https://github.com/owner/repo/pull/123',
    '$ reviewflow analyze https://github.com/owner/repo/pull/123 --detailed',
    '$ reviewflow analyze https://github.com/owner/repo/pull/123 --format json',
    '$ reviewflow analyze https://github.com/owner/repo/pull/123 --format markdown',
  ]

  static flags = {
    detailed: Flags.boolean({
      description: 'Show detailed file-by-file analysis',
      default: false,
    }),
    format: Flags.option({
      description: 'Output format',
      options: ['console', 'json', 'markdown'] as const,
      default: 'console',
    })(),
  }

  static args = {
    pr_url: Args.string({
      description: 'GitHub pull request URL',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Analyze)
    const prUrl = args.pr_url as string
    const format = flags.format as 'console' | 'json' | 'markdown'

    // Initialize GitHub client
    const github = new GitHubClient()

    // Show auth warning if not authenticated (but continue for public repos)
    if (!github.isAuthenticated() && format === 'console') {
      this.warn('No GitHub token found. Public repos will work but rate limits apply.')
      this.warn('Set GITHUB_TOKEN for higher rate limits: export GITHUB_TOKEN=ghp_xxxxxxxxx')
      this.warn('')
    }

    try {
      // Parse PR URL
      const pr = github.parsePRUrl(prUrl)

      // Fetch PR details
      this.debug(`Fetching PR: ${pr.owner}/${pr.repo}#${pr.number}`)
      const prData = await github.fetchPR(pr)

      // Fetch files
      this.debug('Fetching PR files...')
      const files = await github.fetchPRFiles(pr)

      // Analyze
      const result = flags.detailed
        ? analyzePRDetailed(
            {
              number: prData.number,
              title: prData.title,
              author: prData.user.login,
              repository: `${pr.owner}/${pr.repo}`,
              url: prData.html_url,
            },
            files,
          )
        : analyzePR(
            {
              number: prData.number,
              title: prData.title,
              author: prData.user.login,
              repository: `${pr.owner}/${pr.repo}`,
              url: prData.html_url,
            },
            files,
          )

      // Output
      this.log(formatOutput(result, format))
    } catch (error) {
      if (error instanceof Error) {
        if (format === 'json') {
          this.error(JSON.stringify({error: 'ANALYSIS_FAILED', message: error.message}))
        }
        this.error(error.message)
      }
      throw error
    }
  }
}
