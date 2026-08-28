import { BusinessFunctionDefinition } from '../definitions/BusinessFunctionDefinition';
import { Registry } from './Registry';

/**
 * BusinessFunctionRegistry
 * Specialized registry for business functions
 */
export class BusinessFunctionRegistry extends Registry<BusinessFunctionDefinition> {
  protected getTypeName(): string {
    return 'BusinessFunction';
  }

  /**
   * Find all functions in a module
   */
  findByModule(moduleId: string): BusinessFunctionDefinition[] {
    const results: BusinessFunctionDefinition[] = [];
    for (const definition of this.definitions.values()) {
      if (definition.moduleId === moduleId) {
        results.push(definition);
      }
    }
    return results;
  }

  /**
   * Find all functions in a category
   */
  findByCategory(category: string): BusinessFunctionDefinition[] {
    const results: BusinessFunctionDefinition[] = [];
    for (const definition of this.definitions.values()) {
      if (definition.classification === category) {
        results.push(definition);
      }
    }
    return results;
  }

  /**
   * Find all functions with a specific tag
   */
  findByTag(tag: string): BusinessFunctionDefinition[] {
    const results: BusinessFunctionDefinition[] = [];
    for (const definition of this.definitions.values()) {
      if (definition.tags.includes(tag)) {
        results.push(definition);
      }
    }
    return results;
  }

  /**
   * Find all functions supporting an entity type
   */
  supportingEntity(entityType: string): BusinessFunctionDefinition[] {
    const results: BusinessFunctionDefinition[] = [];
    for (const definition of this.definitions.values()) {
      // Check in metadata if entity types are supported
      const supported = definition.metadata && definition.metadata.supportedEntityTypes;
      if (Array.isArray(supported) && supported.includes(entityType)) {
        results.push(definition);
      }
    }
    return results;
  }

  /**
   * Find all functions requiring a specific permission
   */
  requiringPermission(permission: string): BusinessFunctionDefinition[] {
    const results: BusinessFunctionDefinition[] = [];
    for (const definition of this.definitions.values()) {
      const required = definition.authorizationRequirements.permissions || [];
      if (Array.isArray(required) && required.includes(permission)) {
        results.push(definition);
      }
    }
    return results;
  }
}
