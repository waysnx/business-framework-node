import { EntityDefinition } from '../definitions/EntityDefinition';
import { Registry } from './Registry';

/**
 * EntityRegistry
 * Specialized registry for entities
 */
export class EntityRegistry extends Registry<EntityDefinition> {
  protected getTypeName(): string {
    return 'Entity';
  }

  /**
   * Find entity by class name (looked up in metadata)
   */
  findByClass(className: string): EntityDefinition {
    for (const definition of this.definitions.values()) {
      if (definition.metadata && definition.metadata.className === className) {
        return definition;
      }
    }
    throw new Error(`Entity with class name '${className}' not found`);
  }

  /**
   * Find all entities with a specific tag
   */
  findByTag(tag: string): EntityDefinition[] {
    const results: EntityDefinition[] = [];
    for (const definition of this.definitions.values()) {
      if (definition.tags.includes(tag)) {
        results.push(definition);
      }
    }
    return results;
  }
}
