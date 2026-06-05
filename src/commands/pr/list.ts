import {Command, Flags, Args} from '@oclif/core'
import {GitHubClient} from '../../lib/github.js'

export default class PrList extends Command {
  static summary = 'List pull requests for a repository'

  static description = `List pull requests for a GitHub repository.
This helps triage which PRs need attention by showing recent PRs with basic metadata.`

  static examples = [
    '$ reviewflow pr:list owner/repo',
    '$ reviewflow pr:list owner/repo --state open --limit 10',
  ]

  static flags = {
    state: Flags.string({
      description: 'PR state to filter by (open, closed, all)',
      default: 'open',
      options: ['open', 'closed', 'all'],
    }),
    limit: Flags.integer({
      description: 'Maximum number of PRs to list',
      default: 10,
    }),
  }

  static args = {
    repo: Args.string({
      description: 'Repository in format owner/repo',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(PrList)
    const repo = args.repo as string
    const state = flags.state as string
    const limit = flags.limit as number

    // Validate repo format
    const repoMatch = repo.match(/^([^/]+)\/([^/]+)$/)
    if (!repoMatch) {
      this.error('Invalid repo format. Expected: owner/repo')
    }

    const [, owner, repoName] = repoMatch

    const github = new GitHubClient()

    if (!github.isAuthenticated()) {
      this.log('⚠️  Not authenticated with GitHub')
      this.log('')
      this.log('Run: reviewflow auth')
      this.log('Set: export GITHUB_TOKEN=your_token')
      return
    }

    this.log(`📋 Pull Requests for ${owner}/${repoName}`)
    this.log(`State: ${state} | Limit: ${limit}`)
    this.log('')
    this.log('⚠️  PR fetching coming soon')
    this.log('')
    this.log('MVP: Will list PRs with:')
    this.log('  • Number, title, author')
    this.log('  • Creation date, status')
    this.log('  • File change count')
  }
}
