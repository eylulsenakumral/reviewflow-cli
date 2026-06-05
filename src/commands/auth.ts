import {Command} from '@oclif/core'

export default class Auth extends Command {
  static summary = 'Authenticate with GitHub'

  static description = `Authenticate with GitHub using a personal access token.
This token is required for the CLI to access pull requests and repository data.

Get your token at: https://github.com/settings/tokens
Required scopes: repo (for private repos) or public_repo (for public repos)`

  static examples = [
    '$ reviewflow auth',
    '$ export GITHUB_TOKEN=your_token && reviewflow auth',
  ]

  async run(): Promise<void> {
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN

    if (!token) {
      this.log('⚠️  No GitHub token found.')
      this.log('')
      this.log('Get your token at: https://github.com/settings/tokens')
      this.log('Required scopes: repo (or public_repo for public repos only)')
      this.log('')
      this.log('Set it as:')
      this.log('  export GITHUB_TOKEN=your_token')
      this.log('  # Or add to ~/.bashrc or ~/.zshrc')
      return
    }

    this.log('✅ GitHub token found')
    this.log(`Token (first 8 chars): ${token.slice(0, 8)}...`)
    this.log('')
    this.log('You can now run: reviewflow analyze <PR_URL>')
  }
}
