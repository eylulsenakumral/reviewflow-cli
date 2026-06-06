/**
 * ReviewFlow CLI Error Handling
 *
 * Provides structured error types with:
 * - Error codes for programmatic handling
 * - Human-readable messages
 * - Retryability flags
 * - Retry timing information
 */

/**
 * ReviewFlow error codes
 * Each code represents a specific error scenario
 */
export enum ReviewFlowError {
  // Input validation errors
  INVALID_URL = 'INVALID_URL',
  INVALID_REPO_FORMAT = 'INVALID_REPO_FORMAT',

  // GitHub API errors
  PR_NOT_FOUND = 'PR_NOT_FOUND',
  AUTH_FAILED = 'AUTH_FAILED',
  RATE_LIMITED = 'RATE_LIMITED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',

  // Configuration errors
  TOKEN_MISSING = 'TOKEN_MISSING',
  TOKEN_INVALID = 'TOKEN_INVALID',

  // Unknown errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Error messages for each error code
 */
const ERROR_MESSAGES: Record<ReviewFlowError, string> = {
  [ReviewFlowError.INVALID_URL]: 'Invalid PR URL format',
  [ReviewFlowError.INVALID_REPO_FORMAT]: 'Invalid repository format',
  [ReviewFlowError.PR_NOT_FOUND]: 'Pull request not found',
  [ReviewFlowError.AUTH_FAILED]: 'GitHub authentication failed',
  [ReviewFlowError.RATE_LIMITED]: 'GitHub API rate limit exceeded',
  [ReviewFlowError.NETWORK_ERROR]: 'Network connection failed',
  [ReviewFlowError.API_ERROR]: 'GitHub API error',
  [ReviewFlowError.TOKEN_MISSING]: 'GitHub token not found',
  [ReviewFlowError.TOKEN_INVALID]: 'GitHub token is invalid',
  [ReviewFlowError.UNKNOWN_ERROR]: 'An unknown error occurred',
}

/**
 * Retryability configuration for each error type
 */
const RETRYABLE_ERRORS: Set<ReviewFlowError> = new Set([
  ReviewFlowError.RATE_LIMITED,
  ReviewFlowError.NETWORK_ERROR,
  ReviewFlowError.API_ERROR,
])

/**
 * CLI Error class with structured information
 *
 * Provides:
 * - Error code for programmatic handling
 * - Detailed error message
 * - Retryability flag
 * - Optional retry after timestamp
 */
export class CLIError extends Error {
  readonly code: ReviewFlowError
  readonly retryable: boolean
  readonly retryAfter?: Date
  readonly originalError?: unknown

  constructor(
    code: ReviewFlowError,
    message?: string,
    options?: {
      retryable?: boolean
      retryAfter?: Date | number
      cause?: unknown
    },
  ) {
    super(message || ERROR_MESSAGES[code])
    this.name = 'CLIError'
    this.code = code

    // Determine retryability
    if (options?.retryable !== undefined) {
      this.retryable = options.retryable
    } else {
      this.retryable = RETRYABLE_ERRORS.has(code)
    }

    // Handle retry after
    if (options?.retryAfter) {
      this.retryAfter = options.retryAfter instanceof Date
        ? options.retryAfter
        : new Date(Date.now() + options.retryAfter)
    }

    // Store original error for debugging
    this.originalError = options?.cause

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CLIError)
    }
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    return this.retryable
  }

  /**
   * Get time until retry in seconds
   * Returns null if not retryable or no retry time set
   */
  getRetryDelaySeconds(): number | null {
    if (!this.retryable || !this.retryAfter) {
      return null
    }
    const delay = this.retryAfter.getTime() - Date.now()
    return delay > 0 ? Math.ceil(delay / 1000) : null
  }

  /**
   * Format error for console output
   */
  toConsoleString(): string {
    const lines: string[] = []

    lines.push(`Error: ${this.message}`)
    lines.push(`Code: ${this.code}`)

    if (this.retryable && this.retryAfter) {
      const delay = this.getRetryDelaySeconds()
      if (delay) {
        lines.push(`Retry after: ${delay} seconds`)
      }
    }

    if (this.originalError && this.originalError instanceof Error) {
      lines.push(`Details: ${this.originalError.message}`)
    }

    return lines.join('\n')
  }

  /**
   * Convert to JSON for machine-readable output
   */
  toJSON(): Record<string, unknown> {
    return {
      error: this.code,
      message: this.message,
      retryable: this.retryable,
      retry_after: this.retryAfter?.toISOString(),
    }
  }
}

/**
 * Create an INVALID_URL error
 */
export function invalidURLError(url: string, cause?: unknown): CLIError {
  return new CLIError(
    ReviewFlowError.INVALID_URL,
    `Invalid PR URL: "${url}". Expected format: https://github.com/owner/repo/pull/123`,
    {cause},
  )
}

/**
 * Create an INVALID_REPO_FORMAT error
 */
export function invalidRepoFormatError(repo: string, cause?: unknown): CLIError {
  return new CLIError(
    ReviewFlowError.INVALID_REPO_FORMAT,
    `Invalid repository format: "${repo}". Expected format: owner/repo`,
    {cause},
  )
}

/**
 * Create a PR_NOT_FOUND error
 */
export function prNotFoundError(owner: string, repo: string, number: number, cause?: unknown): CLIError {
  return new CLIError(
    ReviewFlowError.PR_NOT_FOUND,
    `PR not found: ${owner}/${repo}#${number}`,
    {retryable: false, cause},
  )
}

/**
 * Create an AUTH_FAILED error
 */
export function authFailedError(cause?: unknown): CLIError {
  return new CLIError(
    ReviewFlowError.AUTH_FAILED,
    'GitHub authentication failed. Check your GITHUB_TOKEN.',
    {retryable: false, cause},
  )
}

/**
 * Create a RATE_LIMITED error
 */
export function rateLimitedError(retryAfter: Date | number, cause?: unknown): CLIError {
  const retryDate = retryAfter instanceof Date ? retryAfter : new Date(Date.now() + retryAfter)
  return new CLIError(
    ReviewFlowError.RATE_LIMITED,
    `GitHub API rate limit exceeded. Resets at ${retryDate.toLocaleTimeString()}`,
    {retryable: true, retryAfter: retryDate, cause},
  )
}

/**
 * Create a NETWORK_ERROR error
 */
export function networkError(cause?: unknown): CLIError {
  return new CLIError(
    ReviewFlowError.NETWORK_ERROR,
    'Network connection failed. Check your internet connection.',
    {retryable: true, cause},
  )
}

/**
 * Create an API_ERROR error
 */
export function apiError(message: string, cause?: unknown): CLIError {
  return new CLIError(
    ReviewFlowError.API_ERROR,
    `GitHub API error: ${message}`,
    {retryable: true, cause},
  )
}

/**
 * Create a TOKEN_MISSING error
 */
export function tokenMissingError(): CLIError {
  return new CLIError(
    ReviewFlowError.TOKEN_MISSING,
    'GitHub token not found. Set GITHUB_TOKEN environment variable.',
    {retryable: false},
  )
}

/**
 * Create a TOKEN_INVALID error
 */
export function tokenInvalidError(cause?: unknown): CLIError {
  return new CLIError(
    ReviewFlowError.TOKEN_INVALID,
    'GitHub token is invalid or expired. Generate a new token at https://github.com/settings/tokens',
    {retryable: false, cause},
  )
}

/**
 * Create an UNKNOWN_ERROR from a generic error
 */
export function unknownError(cause: unknown): CLIError {
  if (cause instanceof Error) {
    return new CLIError(
      ReviewFlowError.UNKNOWN_ERROR,
      cause.message,
      {cause},
    )
  }
  return new CLIError(
    ReviewFlowError.UNKNOWN_ERROR,
    'An unknown error occurred',
    {cause},
  )
}

/**
 * Check if an error is a CLIError
 */
export function isCLIError(error: unknown): error is CLIError {
  return error instanceof CLIError
}

/**
 * Wrap a generic error in a CLIError if it isn't one already
 */
export function wrapError(error: unknown, defaultCode: ReviewFlowError = ReviewFlowError.UNKNOWN_ERROR): CLIError {
  if (isCLIError(error)) {
    return error
  }
  return unknownError(error)
}
