import { WorkflowDefinition } from '../definitions/WorkflowDefinition';
import { Registry } from './Registry';

/**
 * WorkflowRegistry
 * Specialized registry for workflows
 */
export class WorkflowRegistry extends Registry<WorkflowDefinition> {
  protected getTypeName(): string {
    return 'Workflow';
  }

  /**
   * Find all workflows in a module
   */
  findByModule(moduleId: string): WorkflowDefinition[] {
    const results: WorkflowDefinition[] = [];
    for (const definition of this.definitions.values()) {
      if (definition.moduleId === moduleId && definition.enabled) {
        results.push(definition);
      }
    }
    return results;
  }

  /**
   * Find all workflows triggered by a specific trigger type
   */
  findByTrigger(triggerType: string): WorkflowDefinition[] {
    const results: WorkflowDefinition[] = [];
    for (const definition of this.definitions.values()) {
      if (definition.triggerType === triggerType && definition.enabled) {
        results.push(definition);
      }
    }
    return results;
  }

  /**
   * Find all workflows supporting an entity type
   */
  findByEntity(entityType: string): WorkflowDefinition[] {
    const results: WorkflowDefinition[] = [];
    for (const definition of this.definitions.values()) {
      if (definition.supportedEntityTypes.includes(entityType) && definition.enabled) {
        results.push(definition);
      }
    }
    return results;
  }
}
