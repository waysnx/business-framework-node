/**
 * VersionableInterface
 * Defines contract for versioning support
 */
export interface VersionableInterface {
  /**
   * Get current version
   */
  getVersion(): number;

  /**
   * Increment version
   */
  incrementVersion(): void;

  /**
   * Check if version matches
   */
  isVersion(version: number): boolean;
}
