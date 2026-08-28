import { ValidationDefinition } from '../definitions/ValidationDefinition';
import { Registry } from './Registry';

/**
 * ValidationRegistry
 * Specialized registry for validations
 */
export class ValidationRegistry extends Registry<ValidationDefinition> {
  protected getTypeName(): string {
    return 'Validation';
  }

  /**
   * Find all validations for a scope
   */
  findByScope(scope: string): ValidationDefinition[] {
    const results: ValidationDefinition[] = [];
    for (const definition of this.definitions.values()) {
      if (definition.scope === scope && definition.enabled) {
        results.push(definition);
      }
    }
    return results;
  }

  /**
   * Find all validations with a specific severity
   */
  findBySeverity(severity: string): ValidationDefinition[] {
    const results: ValidationDefinition[] = [];
    for (const definition of this.definitions.values()) {
      if (definition.severity === severity && definition.enabled) {
        results.push(definition);
      }
    }
    return results;
  }
}
