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
    // Only the rule's own message is used here; each evaluator supplies a
    // field-specific default when the rule does not define one.
    const message = rule.message || '';

    try {
      // Evaluate based on rule type
      switch (ruleType) {
        case 'required':
          return this.evaluateRequired(validationId, ruleId, rule, request, severity, message);
        case 'range':
          return this.evaluateRange(validationId, ruleId, rule, request, severity, message || `Rule '${ruleId}' failed`);
        case 'format':
          return this.evaluateFormat(validationId, ruleId, rule, request, severity, message || `Rule '${ruleId}' failed`);
        case 'custom':
          return await this.evaluateCustom(validationId, ruleId, rule, request);
        default:
          // Phase 0 (D2): unknown rule types fail closed as errors.
          return ValidationFramework.frameworkIssue(
            validationId,
            ruleId,
            ValidationFramework.CODE_UNKNOWN_RULE,
            `Rule '${ruleId}' has unsupported rule type '${ruleType}'`,
            { ruleType, field: rule.field }
          );
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
    if (!field) {
      // A required rule without a target cannot be evaluated: fail closed.
      return ValidationFramework.frameworkIssue(
        validationId,
        ruleId,
        ValidationFramework.CODE_INVALID_RULE,
        `Rule '${ruleId}' of type 'required' has no target field`,
        { ruleType: 'required' }
      );
    }

    const value = this.getNestedValue(request, field);

    if (ValidationFramework.isMissingOrEmpty(value)) {
      return new ValidationIssue({
        validationId: validationId,
        severity: severity as 'error' | 'warning',
        message: message || `Field '${field}' is required`,
        context: { ruleId, field },
        code: rule.code || ValidationFramework.CODE_REQUIRED,
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
   * Evaluate custom rule (application extension point).
   *
   * Phase 0 (D2): the framework has no built-in custom rule implementation, so
   * the default FAILS CLOSED with WBF.VALIDATION.UNKNOWN_RULE instead of
   * silently passing. Applications implement custom rules by subclassing
   * ValidationFramework and overriding this method (mirrors the Laravel
   * runtime's evaluateRule() extension point). Return undefined when the rule
   * passes, or a ValidationIssue when it fails.
   */
  protected async evaluateCustom(
    validationId: string,
    ruleId: string,
    rule: any,
    _request: any
  ): Promise<ValidationIssue | undefined> {
    return ValidationFramework.frameworkIssue(
      validationId,
      ruleId,
      ValidationFramework.CODE_UNKNOWN_RULE,
      `Rule '${ruleId}' is a custom rule with no application implementation`,
      { ruleType: 'custom', field: rule?.field }
    );
  }

  /** Issue code for rule types the framework cannot evaluate (fail closed). */
  static readonly CODE_UNKNOWN_RULE = 'WBF.VALIDATION.UNKNOWN_RULE';
  /** Issue code for structurally invalid rule definitions (fail closed). */
  static readonly CODE_INVALID_RULE = 'WBF.VALIDATION.INVALID_RULE';
  /** Default issue code for failed required rules without their own code. */
  static readonly CODE_REQUIRED = 'WBF.VALIDATION.REQUIRED';

  /**
   * Required-rule semantics (Phase 0 validation contract, identical in the
   * Laravel runtime): missing, null, a string that is empty after trimming
   * whitespace, or an empty array.
   */
  static isMissingOrEmpty(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
  }

  /**
   * Framework-detected failure. Always error severity regardless of the rule's
   * declared severity: an unevaluable rule must never be downgraded to a
   * non-blocking warning.
   */
  private static frameworkIssue(
    validationId: string,
    ruleId: string,
    code: string,
    message: string,
    context: Record<string, any>
  ): ValidationIssue {
    return new ValidationIssue({
      validationId,
      severity: 'error',
      message,
      context: { ruleId, ...context },
      code,
    });
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
