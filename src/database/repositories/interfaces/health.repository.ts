export interface HealthRepository {
  isReady(): Promise<boolean>;
}
