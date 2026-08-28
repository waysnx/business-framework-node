import { ModuleDefinition } from '../definitions/ModuleDefinition';
import { Registry } from './Registry';

/**
 * ModuleRegistry
 * Specialized registry for modules
 */
export class ModuleRegistry extends Registry<ModuleDefinition> {
  protected getTypeName(): string {
    return 'Module';
  }

  /**
   * Find all modules for a domain
   */
  findByDomain(domainId: string): ModuleDefinition[] {
    const results: ModuleDefinition[] = [];
    for (const definition of this.definitions.values()) {
      if (definition.domains.includes(domainId)) {
        results.push(definition);
      }
    }
    return results;
  }

  /**
   * Get all active modules
   */
  active(): ModuleDefinition[] {
    const results: ModuleDefinition[] = [];
    for (const definition of this.definitions.values()) {
      if (definition.status === 'Operate' || definition.status === 'Implement') {
        results.push(definition);
      }
    }
    return results;
  }

  /**
   * Get modules with their dependencies
   */
  withDependencies(): ModuleDefinition[] {
    const results: ModuleDefinition[] = [];
    const seen = new Set<string>();

    const addWithDeps = (moduleId: string) => {
      if (seen.has(moduleId)) return;
      seen.add(moduleId);

      try {
        const module = this.findById(moduleId);
        results.push(module);

        // Recursively add dependencies
        for (const depId of module.dependencies) {
          addWithDeps(depId);
        }
      } catch {
        // Dependency not found, skip
      }
    };

    for (const definition of this.definitions.values()) {
      addWithDeps(definition.id);
    }

    return results;
  }
}
