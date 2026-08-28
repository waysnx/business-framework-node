import { RegistryError } from './RegistryError';

/**
 * NotFoundError
 * Raised when resource is not found in registry
 */
export class NotFoundError extends RegistryError {
  readonly itemType: string;
  readonly itemId: string;

  constructor(itemType: string, itemId: string) {
    const message = `${itemType} '${itemId}' not found`;
    super(message, { itemType, itemId });
    this.name = 'NotFoundError';
    this.itemType = itemType;
    this.itemId = itemId;
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}
