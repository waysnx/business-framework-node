import { WBFError } from './WBFError';

/**
 * ResourceNotFound
 * Raised when a required business resource is not found
 */
export class ResourceNotFound extends WBFError {
  readonly resourceType: string;
  readonly resourceId: string;

  constructor(resourceType: string, resourceId: string) {
    const message = `${resourceType} '${resourceId}' not found`;
    super(message, 'ResourceNotFound', { resourceType, resourceId });
    this.name = 'ResourceNotFound';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
    Object.setPrototypeOf(this, ResourceNotFound.prototype);
  }
}
