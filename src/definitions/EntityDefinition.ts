/**
 * EntityDefinition
 * Immutable definition of an entity artifact
 */
export class EntityDefinition {
  readonly id: string;
  readonly name: string;
  readonly displayName: string;
  readonly description: string;
  readonly moduleId: string;
  readonly version: number;
  readonly enabled: boolean;
  readonly tags: readonly string[];
  readonly metadata: Readonly<Record<string, any>>;

  constructor(props: {
    id: string;
    name: string;
    displayName: string;
    description: string;
    moduleId: string;
    version?: number;
    enabled?: boolean;
    tags?: string[];
    metadata?: Record<string, any>;
  }) {
    if (!props.id) throw new Error('EntityDefinition requires id');
    if (!props.name) throw new Error('EntityDefinition requires name');
    if (!props.displayName) throw new Error('EntityDefinition requires displayName');
    if (!props.moduleId) throw new Error('EntityDefinition requires moduleId');

    this.id = props.id;
    this.name = props.name;
    this.displayName = props.displayName;
    this.description = props.description || '';
    this.moduleId = props.moduleId;
    this.version = props.version || 1;
    this.enabled = props.enabled !== false;
    this.tags = Object.freeze([...(props.tags || [])]);
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
      version: this.version,
      enabled: this.enabled,
      tags: [...this.tags],
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
