/**
 * SerializableInterface
 * Defines contract for objects that can be serialized to JSON
 */
export interface SerializableInterface {
  /**
   * Convert entity to plain object representation
   */
  toArray(): Record<string, any>;

  /**
   * Convert entity to JSON string
   */
  toJson(): string;
}
