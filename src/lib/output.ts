/**
 * ReviewFlow Output Formatter
 * MVP: Console, JSON, and Markdown output formats
 */

import chalk from 'chalk'
import type {AnalysisResult, RiskLevel} from '../types/index.js'

/**
 * Risk level colors
 */
const RISK_COLORS = {
  LOW: {symbol: '✅', color: chalk.green, label: 'LOW'},
  MEDIUM: {symbol: '⚠️', color: chalk.yellow, label: 'MEDIUM'},
  HIGH: {symbol: '🔴', color: chalk.red, label: 'HIGH'},
}

/**
 * Get risk color configuration
 */
function getRiskConfig(level: RiskLevel) {
  return RISK_COLORS[level]
}

/**
 * Format console output
 */
export function formatConsole(result: AnalysisResult): string {
  const lines: string[] = []
  const riskConfig = getRiskConfig(result.risk.level)

  // Header
  lines.push(chalk.bold('🔍 ReviewFlow CLI v0.2.0'))
  lines.push('')

  // PR info
  lines.push(chalk.bold(`PR #${result.pr.number}: ${result.pr.title}`))
  lines.push(`Author: @${result.pr.author}`)
  lines.push(`Repository: ${result.pr.repository}`)
  lines.push('')

  // Risk box
  const boxWidth = 49
  const riskLine = `RISK LEVEL: ${result.risk.level.padEnd(5)} ${riskConfig.symbol}`
  const effortLine = `Review Effort: ${result.risk.effort}`

  lines.push('┌' + '─'.repeat(boxWidth) + '┐')
  lines.push('│' + riskConfig.color(riskLine.padEnd(boxWidth)) + '│')
  lines.push('│' + effortLine.padEnd(boxWidth + 10) + '│')
  lines.push('└' + '─'.repeat(boxWidth) + '┘')
  lines.push('')

  // Why section
  const whyLabel = result.risk.level === 'HIGH' ? 'Why this needs attention:' : 'Why this is low risk:'
  lines.push(chalk.bold(whyLabel))
  for (const explanation of result.risk.explanation) {
    lines.push(`  • ${explanation}`)
  }
  lines.push('')

  // Files summary
  lines.push(chalk.bold('Files changed:'))
  lines.push(
    `  ${result.files.total} files, +${result.files.lines_added}/-${result.files.lines_deleted} lines`,
  )
  lines.push(
    `  Code: ${result.files.by_type.code} | Tests: ${result.files.by_type.test} | Docs: ${result.files.by_type.docs} | Config: ${result.files.by_type.config}`,
  )
  if (result.files.sensitive_paths.length > 0) {
    lines.push(`  ${chalk.red('Sensitive paths:')} ${result.files.sensitive_paths.join(', ')}`)
  }
  lines.push('')

  // File details (if available)
  if (result.file_details && result.file_details.length > 0) {
    lines.push(chalk.bold('File details:'))
    for (const file of result.file_details.slice(0, 10)) {
      const isSensitive = result.files.sensitive_paths.some(p => file.path.startsWith(p))
      const icon = isSensitive ? '⚠️' : '✅'
      const statusChar = file.status === 'added' ? '+' : file.status === 'removed' ? '-' : '~'
      lines.push(
        `  ${icon} ${file.path} (${statusChar}${file.additions}, -${file.deletions}) ${isSensitive ? chalk.red('sensitive') : ''}`,
      )
    }
    if (result.file_details.length > 10) {
      lines.push(`  ... and ${result.file_details.length - 10} more files`)
    }
    lines.push('')
  }

  // Recommendation
  lines.push(chalk.bold('Recommendation:'))
  lines.push(`  ${result.recommendation}`)
  lines.push('')

  // Footer
  lines.push(`View PR: ${result.pr.url}`)

  return lines.join('\n')
}

/**
 * Format JSON output
 */
export function formatJSON(result: AnalysisResult): string {
  const output = {
    pr_number: result.pr.number,
    title: result.pr.title,
    author: result.pr.author,
    repository: result.pr.repository,
    risk_level: result.risk.level,
    risk_score: Math.round(result.risk.score * 10) / 10,
    review_effort: result.risk.effort,
    files_changed: result.files.total,
    lines_added: result.files.lines_added,
    lines_deleted: result.files.lines_deleted,
    lines_changed: result.files.lines_changed,
    files_by_type: result.files.by_type,
    sensitive_paths_touched: result.files.sensitive_paths,
    explanation: result.risk.explanation,
    recommendation: result.recommendation,
    pr_url: result.pr.url,
    file_details: result.file_details,
  }

  return JSON.stringify(output, null, 2)
}

/**
 * Format Markdown output
 */
export function formatMarkdown(result: AnalysisResult): string {
  const lines: string[] = []
  const riskBadge = result.risk.level === 'HIGH' ? '🔴' : result.risk.level === 'MEDIUM' ? '⚠️' : '✅'

  // Header
  lines.push('## ReviewFlow Analysis')
  lines.push('')
  lines.push(`**PR:** [#${result.pr.number}](${result.pr.url}) - ${result.pr.title}`)
  lines.push(`**Author:** @${result.pr.author}`)
  lines.push(`**Repository:** ${result.pr.repository}`)
  lines.push('')

  // Risk level
  lines.push('### Risk Assessment')
  lines.push('')
  lines.push(`**Level:** ${riskBadge} **${result.risk.level}**`)
  lines.push(`**Score:** ${result.risk.score.toFixed(1)}`)
  lines.push(`**Estimated Review Time:** ${result.risk.effort}`)
  lines.push('')

  // Explanation
  lines.push('### Analysis')
  lines.push('')
  for (const explanation of result.risk.explanation) {
    lines.push(`- ${explanation}`)
  }
  lines.push('')

  // Files summary
  lines.push('### Files Changed')
  lines.push('')
  lines.push(`- **Total:** ${result.files.total} files`)
  lines.push(`- **Lines:** +${result.files.lines_added}/-${result.files.lines_deleted}`)
  lines.push(`- **By Type:** ${result.files.by_type.code} code, ${result.files.by_type.test} test, ${result.files.by_type.docs} docs, ${result.files.by_type.config} config`)
  if (result.files.sensitive_paths.length > 0) {
    lines.push(`- **Sensitive Paths:** ${result.files.sensitive_paths.join(', ')}`)
  }
  lines.push('')

  // File details table
  if (result.file_details && result.file_details.length > 0) {
    lines.push('### File Details')
    lines.push('')
    lines.push('| File | Changes | Status | Notes |')
    lines.push('|------|----------|--------|-------|')
    for (const file of result.file_details.slice(0, 20)) {
      const isSensitive = result.files.sensitive_paths.some(p => file.path.startsWith(p))
      const notes = isSensitive ? '⚠️ sensitive' : ''
      lines.push(`| \`${file.path}\` | +${file.additions}/-${file.deletions} | ${file.status} | ${notes} |`)
    }
    if (result.file_details.length > 20) {
      lines.push(`| ... | ... | ... | ... and ${result.file_details.length - 20} more files |`)
    }
    lines.push('')
  }

  // Recommendation
  lines.push('### Recommendation')
  lines.push('')
  lines.push(`> ${result.recommendation}`)
  lines.push('')

  return lines.join('\n')
}

/**
 * Format output based on format type
 */
export function formatOutput(result: AnalysisResult, format: 'console' | 'json' | 'markdown'): string {
  switch (format) {
    case 'json':
      return formatJSON(result)
    case 'markdown':
      return formatMarkdown(result)
    default:
      return formatConsole(result)
  }
}
