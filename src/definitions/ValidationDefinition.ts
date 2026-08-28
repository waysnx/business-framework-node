/**
 * ValidationDefinition
 * Immutable definition of a validation rule artifact
 */
export class ValidationDefinition {
  readonly id: string;
  readonly name: string;
  readonly displayName: string;
  readonly description: string;
  readonly moduleId: string;
  readonly scope: string; // entity type or operation scope
  readonly severity: string; // error or warning
  readonly enabled: boolean;
  readonly version: number;
  readonly rules: Readonly<Record<string, any>>;
  readonly metadata: Readonly<Record<string, any>>;

  constructor(props: {
    id: string;
    name: string;
    displayName: string;
    description: string;
    moduleId: string;
    scope: string;
    severity?: string;
    enabled?: boolean;
    version?: number;
    rules?: Record<string, any>;
    metadata?: Record<string, any>;
  }) {
    if (!props.id) throw new Error('ValidationDefinition requires id');
    if (!props.name) throw new Error('ValidationDefinition requires name');
    if (!props.displayName) throw new Error('ValidationDefinition requires displayName');
    if (!props.moduleId) throw new Error('ValidationDefinition requires moduleId');
    if (!props.scope) throw new Error('ValidationDefinition requires scope');

    this.id = props.id;
    this.name = props.name;
    this.displayName = props.displayName;
    this.description = props.description || '';
    this.moduleId = props.moduleId;
    this.scope = props.scope;
    this.severity = props.severity || 'error';
    this.enabled = props.enabled !== false;
    this.version = props.version || 1;
    this.rules = Object.freeze({ ...(props.rules || {}) });
    this.metadata = Object.freeze({ ...(props.metadata || {}) });

    Object.freeze(this);
  }

  /**
   * Serialize to object
   */
  toObject(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      displayName: this.displayName,
      description: this.description,
      moduleId: this.moduleId,
      scope: this.scope,
      severity: this.severity,
      enabled: this.enabled,
      version: this.version,
      rules: { ...this.rules },
      metadata: { ...this.metadata },
    };
  }

  /**
   * Serialize to JSON
   */
  toJson(): string {
    return JSON.stringify(this.toObject());
  }
}
