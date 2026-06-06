import {Command, Flags, Args} from '@oclif/core'
import {GitHubClient} from '../../lib/github.js'
import {isCLIError} from '../../lib/errors.js'

export default class PrList extends Command {
  static summary = 'List pull requests for a repository'

  static description = `List pull requests for a GitHub repository.
This helps triage which PRs need attention by showing recent PRs with basic metadata.`

  static examples = [
    '$ reviewflow pr:list vercel/next.js',
    '$ reviewflow pr:list facebook/react --state open --limit 10',
    '$ reviewflow pr:list owner/repo --state closed --limit 50',
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
    verbose: Flags.boolean({
      description: 'Show detailed progress messages for debugging',
      default: false,
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

    const github = new GitHubClient()

    // Validate repo format early
    let owner: string
    let repoName: string
    try {
      const parsed = github.parseRepository(repo)
      owner = parsed.owner
      repoName = parsed.repo
    } catch (error) {
      if (isCLIError(error)) {
        this.error(error.message)
      }
      this.error('Invalid repo format. Expected: owner/repo')
    }

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
