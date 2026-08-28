import { RegistryError } from './RegistryError';

/**
 * DuplicateError
 * Raised when attempting to register duplicate ID, name, or alias
 */
export class DuplicateError extends RegistryError {
  readonly itemType: string;
  readonly itemId: string;

  constructor(itemType: string, itemId: string) {
    const message = `${itemType} '${itemId}' already registered`;
    super(message, { itemType, itemId });
    this.name = 'DuplicateError';
    this.itemType = itemType;
    this.itemId = itemId;
    Object.setPrototypeOf(this, DuplicateError.prototype);
  }
}
