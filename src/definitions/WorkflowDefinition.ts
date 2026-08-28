import { WorkflowStep } from './WorkflowStep';

/**
 * WorkflowDefinition
 * Immutable definition of a workflow (technical specification)
 */
export class WorkflowDefinition {
  readonly id: string;
  readonly name: string;
  readonly displayName: string;
  readonly description: string;
  readonly moduleId: string;
  readonly version: string;
  readonly category: string;
  readonly triggerType: string; // event, manual, scheduled
  readonly triggerEvent: string;
  readonly entryFunctionId: string;
  readonly exitFunctionId: string;
  readonly steps: readonly WorkflowStep[];
  readonly supportedEntityTypes: readonly string[];
  readonly priority: number;
  readonly enabled: boolean;
  readonly tags: readonly string[];
  readonly metadata: Readonly<Record<string, any>>;

  constructor(props: {
    id: string;
    name: string;
    displayName: string;
    description: string;
    moduleId: string;
    version?: string;
    category?: string;
    triggerType?: string;
    triggerEvent?: string;
    entryFunctionId?: string;
    exitFunctionId?: string;
    steps?: WorkflowStep[];
    supportedEntityTypes?: string[];
    priority?: number;
    enabled?: boolean;
    tags?: string[];
    metadata?: Record<string, any>;
  }) {
    if (!props.id) throw new Error('WorkflowDefinition requires id');
    if (!props.name) throw new Error('WorkflowDefinition requires name');
    if (!props.displayName) throw new Error('WorkflowDefinition requires displayName');
    if (!props.moduleId) throw new Error('WorkflowDefinition requires moduleId');

    this.id = props.id;
    this.name = props.name;
    this.displayName = props.displayName;
    this.description = props.description || '';
    this.moduleId = props.moduleId;
    this.version = props.version || '1.0.0';
    this.category = props.category || '';
    this.triggerType = props.triggerType || 'manual';
    this.triggerEvent = props.triggerEvent || '';
    this.entryFunctionId = props.entryFunctionId || '';
    this.exitFunctionId = props.exitFunctionId || '';
    this.steps = Object.freeze([...(props.steps || [])]);
    this.supportedEntityTypes = Object.freeze([...(props.supportedEntityTypes || [])]);
    this.priority = props.priority || 0;
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
      category: this.category,
      triggerType: this.triggerType,
      triggerEvent: this.triggerEvent,
      entryFunctionId: this.entryFunctionId,
      exitFunctionId: this.exitFunctionId,
      steps: this.steps.map((s) => s.toObject()),
      supportedEntityTypes: [...this.supportedEntityTypes],
      priority: this.priority,
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
