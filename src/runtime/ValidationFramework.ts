import { ValidationRegistry } from '../registries';
import { ValidationIssue } from './ValidationIssue';

/**
 * ValidationFramework
 * Executes validation rules from the ValidationRegistry
 * Validation is business-layer (distinct from HTTP/DTO validation)
 */
export class ValidationFramework {
  constructor(private registry: ValidationRegistry) {
    if (!registry) throw new Error('ValidationFramework requires ValidationRegistry');
  }

  /**
   * Evaluate all validations for a given scope
   * Returns array of ValidationIssues (empty if all valid)
   */
  async evaluate(request: any, scope: string): Promise<ValidationIssue[]> {
    if (!scope) throw new Error('ValidationFramework.evaluate requires scope');

    const issues: ValidationIssue[] = [];

    try {
      // Get all enabled validations for this scope
      const validations = this.registry.findByScope(scope);

      // Evaluate each validation
      for (const validation of validations) {
        // Skip disabled validations
        if ((validation as any).enabled === false) {
          continue;
        }

        // Evaluate the validation rules against the request
        const validationIssues = await this.evaluateValidation(validation, request);
        issues.push(...validationIssues);
      }
    } catch (error) {
      // If validation lookup fails, wrap it
      if (!(error instanceof Error)) {
        throw new Error(`ValidationFramework error: ${error}`);
      }
      throw error;
    }

    return issues;
  }

  /**
   * Evaluate a single validation against request
   * Validation rules are stored as metadata in the ValidationDefinition
   */
  private async evaluateValidation(validation: any, request: any): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    try {
      // Get rules from validation definition
      // Rules are structured as a map of rule ID to rule definition
      const rules = validation.rules || {};

      for (const [ruleId, rule] of Object.entries(rules)) {
        const ruleIssue = await this.evaluateRule(validation.id, ruleId, rule, request);
        if (ruleIssue) {
          issues.push(ruleIssue);
        }
      }
    } catch (error) {
      // Wrap rule evaluation errors
      throw new Error(
        `Error evaluating validation '${validation.id}': ${(error as Error).message}`
      );
    }

    return issues;
  }

  /**
   * Evaluate a single validation rule
   * Rules are simple objects with conditions
   * Returns ValidationIssue if rule violated, undefined if valid
   */
  private async evaluateRule(
    validationId: string,
    ruleId: string,
    rule: any,
    request: any
  ): Promise<ValidationIssue | undefined> {
    if (!rule) return undefined;

    // Get rule metadata
    const ruleType = rule.type || 'custom';
    const severity = rule.severity || 'error';
    const message = rule.message || `Rule '${ruleId}' failed`;

    try {
      // Evaluate based on rule type
      switch (ruleType) {
        case 'required':
          return this.evaluateRequired(validationId, ruleId, rule, request, severity, message);
        case 'range':
          return this.evaluateRange(validationId, ruleId, rule, request, severity, message);
        case 'format':
          return this.evaluateFormat(validationId, ruleId, rule, request, severity, message);
        case 'custom':
          return this.evaluateCustom(rule);
        default:
          // Unknown rule type - treat as passing
          return undefined;
      }
    } catch (error) {
      // Rule evaluation error - create issue
      return new ValidationIssue({
        validationId: validationId,
        severity: 'error',
        message: `Rule evaluation error: ${(error as Error).message}`,
        context: { ruleId, ruleType },
      });
    }
  }

  /**
   * Evaluate required rule
   */
  private evaluateRequired(
    validationId: string,
    ruleId: string,
    rule: any,
    request: any,
    severity: string,
    message: string
  ): ValidationIssue | undefined {
    const field = rule.field;
    if (!field) return undefined;

    const value = this.getNestedValue(request, field);

    if (value === null || value === undefined || value === '') {
      return new ValidationIssue({
        validationId: validationId,
        severity: severity as 'error' | 'warning',
        message: message || `Field '${field}' is required`,
        context: { ruleId, field },
      });
    }

    return undefined;
  }

  /**
   * Evaluate range rule
   */
  private evaluateRange(
    validationId: string,
    ruleId: string,
    rule: any,
    request: any,
    severity: string,
    message: string
  ): ValidationIssue | undefined {
    const field = rule.field;
    const min = rule.min;
    const max = rule.max;

    if (!field) return undefined;

    const value = this.getNestedValue(request, field);
    if (value === null || value === undefined) return undefined;

    const numValue = typeof value === 'number' ? value : (value as any).length;

    if ((min !== undefined && numValue < min) || (max !== undefined && numValue > max)) {
      return new ValidationIssue({
        validationId: validationId,
        severity: severity as 'error' | 'warning',
        message: message || `Field '${field}' must be between ${min} and ${max}`,
        context: { ruleId, field, value: numValue, min, max },
      });
    }

    return undefined;
  }

  /**
   * Evaluate format rule
   */
  private evaluateFormat(
    validationId: string,
    ruleId: string,
    rule: any,
    request: any,
    severity: string,
    message: string
  ): ValidationIssue | undefined {
    const field = rule.field;
    const pattern = rule.pattern;

    if (!field || !pattern) return undefined;

    const value = this.getNestedValue(request, field);
    if (value === null || value === undefined) return undefined;

    const regex = new RegExp(pattern);
    if (!regex.test(String(value))) {
      return new ValidationIssue({
        validationId: validationId,
        severity: severity as 'error' | 'warning',
        message: message || `Field '${field}' format is invalid`,
        context: { ruleId, field, pattern },
      });
    }

    return undefined;
  }

  /**
   * Evaluate custom rule
   * Custom rules are evaluated via a function in metadata
   */
  private async evaluateCustom(_rule: any): Promise<ValidationIssue | undefined> {
    // Custom rules would need to be registered via metadata
    // For now, treat as passing
    return undefined;
  }

  /**
   * Helper to get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return undefined;

    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }

    return current;
  }
}
