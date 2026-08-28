/**
 * AuditableInterface
 * Defines contract for audit tracking (creation/update timestamps and actors)
 */
export interface AuditableInterface {
  /**
   * Get creation timestamp
   */
  getCreatedAt(): Date;

  /**
   * Get creator identifier
   */
  getCreatedBy(): string | number;

  /**
   * Get last update timestamp
   */
  getUpdatedAt(): Date;

  /**
   * Get last updater identifier
   */
  getUpdatedBy(): string | number;

  /**
   * Set creation information
   */
  setCreatedAt(date: Date, by: string | number): void;

  /**
   * Set update information
   */
  setUpdatedAt(date: Date, by: string | number): void;
}
