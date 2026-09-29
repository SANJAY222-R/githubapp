import { AppError } from "../errors.js";

export type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

export class GithubDegradedError extends AppError {
  constructor(message = "GitHub API is currently degraded. Serving cached content.") {
    super(message, 503, "github_degraded");
    this.name = "GithubDegradedError";
  }
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  cooldownMs?: number;
  successThreshold?: number;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = "CLOSED";
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly successThreshold: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.cooldownMs = options.cooldownMs ?? 30_000;
    this.successThreshold = options.successThreshold ?? 2;
  }

  public getState(): CircuitBreakerState {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime >= this.cooldownMs) {
        this.state = "HALF_OPEN";
        this.successCount = 0;
      }
    }
    return this.state;
  }

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === "OPEN") {
      throw new GithubDegradedError();
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (err) {
      this.recordFailure(err);
      throw err;
    }
  }

  public recordSuccess(): void {
    if (this.state === "HALF_OPEN") {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = "CLOSED";
        this.failureCount = 0;
        this.successCount = 0;
      }
    } else if (this.state === "CLOSED") {
      this.failureCount = 0;
    }
  }

  public recordFailure(err?: unknown): void {
    const isDegradedError = this.isServerError(err);
    if (!isDegradedError) return;

    this.lastFailureTime = Date.now();
    if (this.state === "HALF_OPEN") {
      this.state = "OPEN";
      this.successCount = 0;
    } else if (this.state === "CLOSED") {
      this.failureCount++;
      if (this.failureCount >= this.failureThreshold) {
        this.state = "OPEN";
      }
    }
  }

  private isServerError(err: unknown): boolean {
    if (!err || typeof err !== "object") return false;
    const status = (err as { status?: number }).status;
    if (status && status >= 500) return true;
    const code = (err as { code?: string }).code;
    if (code && ["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "ECONNRESET"].includes(code)) return true;
    return false;
  }

  public reset(): void {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}

export const githubCircuitBreaker = new CircuitBreaker();
