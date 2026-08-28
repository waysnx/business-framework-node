/**
 * MetadataInterface
 * Defines contract for managing arbitrary metadata
 */
export interface MetadataInterface {
  /**
   * Get all metadata
   */
  getMetadata(): Record<string, any>;

  /**
   * Get specific metadata value
   */
  getMetadataValue(key: string, defaultValue?: any): any;

  /**
   * Set metadata value
   */
  setMetadataValue(key: string, value: any): void;

  /**
   * Check if metadata key exists
   */
  hasMetadata(key: string): boolean;

  /**
   * Remove metadata key
   */
  removeMetadata(key: string): void;

  /**
   * Clear all metadata
   */
  clearMetadata(): void;
}
