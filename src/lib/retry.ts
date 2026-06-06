/**
 * ReviewFlow Retry Logic
 *
 * Provides exponential backoff retry functionality for:
 * - Rate-limited API requests
 * - Intermittent network failures
 * - Temporary API errors
 */

import {CLIError, isCLIError, unknownError} from './errors.js'

/**
 * Retry configuration
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number
  /** Initial delay in milliseconds (default: 1000) */
  initialDelay?: number
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelay?: number
  /** Exponential backoff multiplier (default: 2) */
  backoffMultiplier?: number
  /** Whether to show progress messages (default: true) */
  silent?: boolean
  /** Custom retry condition (default: checks isRetryable()) */
  shouldRetry?: (error: CLIError) => boolean
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  silent: false,
  shouldRetry: (error: CLIError) => error.isRetryable(),
}

/**
 * Calculate delay for a given attempt using exponential backoff
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const exponentialDelay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt - 1)
  return Math.min(exponentialDelay, options.maxDelay)
}

/**
 * Format delay for human-readable output
 */
function formatDelay(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }
  return `${(ms / 1000).toFixed(1)}s`
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Wrapper function to retry operations with exponential backoff
 *
 * @example
 * ```ts
 * const result = await withRetry(
 *   async () => github.fetchPR(pr),
 *   { maxAttempts: 3 }
 * )
 * ```
 *
 * @param fn - Async function to retry
 * @param options - Retry configuration
 * @returns Promise that resolves with the function result or rejects with the last error
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const opts = {...DEFAULT_RETRY_OPTIONS, ...options}

  let lastError: Error | CLIError | undefined

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      // Convert to CLIError if needed
      let cliError: CLIError
      if (isCLIError(error)) {
        cliError = error
      } else {
        cliError = unknownError(error)
      }

      lastError = cliError

      // Check if we should retry
      if (!opts.shouldRetry(cliError)) {
        throw cliError
      }

      // Check if this is the last attempt
      if (attempt === opts.maxAttempts) {
        throw cliError
      }

      // Calculate delay
      const delayMs = calculateDelay(attempt, opts)

      // Use retryAfter from error if available
      let actualDelay = delayMs
      if (cliError.retryAfter) {
        const retryDelay = cliError.getRetryDelaySeconds()
        if (retryDelay && retryDelay > 0) {
          actualDelay = retryDelay * 1000
        }
      }

      // Show progress message
      if (!opts.silent) {
        console.warn(
          `Attempt ${attempt}/${opts.maxAttempts} failed. Retrying in ${formatDelay(actualDelay)}...`,
        )
        if (cliError.message) {
          console.warn(`  Reason: ${cliError.message}`)
        }
      }

      // Wait before retry
      await sleep(actualDelay)
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError
}

/**
 * Create a retryable version of a function
 *
 * @example
 * ```ts
 * const fetchWithRetry = createRetryable(github.fetchPR.bind(github))
 * const pr = await fetchWithRetry(pr)
 * ```
 *
 * @param fn - Async function to make retryable
 * @param options - Retry configuration
 * @returns A wrapped function that will retry on failure
 */
export function createRetryable<T extends (...args: any[]) => any>(
  fn: T,
  options: RetryOptions = {},
): T {
  return (async (...args: Parameters<T>) => {
    return withRetry(() => fn(...args), options)
  }) as T
}

/**
 * Retry with a specific condition
 *
 * @example
 * ```ts
 * await withRetryConditional(
 *   async () => github.fetchPR(pr),
 *   (error) => error.code === ReviewFlowError.RATE_LIMITED,
 *   { maxAttempts: 5 }
 * )
 * ```
 *
 * @param fn - Async function to retry
 * @param shouldRetry - Function that determines if an error is retryable
 * @param options - Retry configuration
 */
export async function withRetryConditional<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: CLIError) => boolean,
  options: RetryOptions = {},
): Promise<T> {
  return withRetry(fn, {...options, shouldRetry})
}
