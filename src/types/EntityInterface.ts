import { SerializableInterface } from './SerializableInterface';

/**
 * EntityInterface
 * Portable WBF contract for business entities
 * Core contract: Identity, Type, Version, Serialization
 */
export interface EntityInterface extends SerializableInterface {
  /**
   * Get unique entity identifier
   */
  getEntityId(): string | number;

  /**
   * Get entity type name (domain classification)
   */
  getEntityType(): string;

  /**
   * Get entity version number
   */
  getEntityVersion(): number;
}
