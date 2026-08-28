/**
 * ModuleDefinition
 * Immutable definition of a module (organizational/governance concept)
 */
export class ModuleDefinition {
  readonly id: string;
  readonly name: string;
  readonly displayName: string;
  readonly description: string;
  readonly status: string; // Identify, Design, Review, Approve, Implement, Operate, Improve, Retire
  readonly businessOwner: string | number;
  readonly version: number;
  readonly domains: readonly string[];
  readonly dependencies: readonly string[];
  readonly metadata: Readonly<Record<string, any>>;

  constructor(props: {
    id: string;
    name: string;
    displayName: string;
    description: string;
    status?: string;
    businessOwner?: string | number;
    version?: number;
    domains?: string[];
    dependencies?: string[];
    metadata?: Record<string, any>;
  }) {
    if (!props.id) throw new Error('ModuleDefinition requires id');
    if (!props.name) throw new Error('ModuleDefinition requires name');
    if (!props.displayName) throw new Error('ModuleDefinition requires displayName');

    this.id = props.id;
    this.name = props.name;
    this.displayName = props.displayName;
    this.description = props.description || '';
    this.status = props.status || 'Draft';
    this.businessOwner = props.businessOwner || '';
    this.version = props.version || 1;
    this.domains = Object.freeze([...(props.domains || [])]);
    this.dependencies = Object.freeze([...(props.dependencies || [])]);
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
      status: this.status,
      businessOwner: this.businessOwner,
      version: this.version,
      domains: [...this.domains],
      dependencies: [...this.dependencies],
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
