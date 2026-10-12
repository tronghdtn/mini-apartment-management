export type HealthState = 'ok' | 'degraded'

export interface HealthStatus {
  status: HealthState
  app: string
  environment: string
  /** Chỉ có khi APP_DEBUG=true. */
  laravel_version?: string
  php_version?: string
  database: {
    status: HealthState
    driver: string
    error: string | null
  }
  timestamp: string
}
