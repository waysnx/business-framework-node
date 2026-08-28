/**
 * LifecycleContext
 * Context passed to lifecycle handlers during event dispatch
 * Contains information about the entity, action, and actor
 */
export class LifecycleContext {
  readonly entityId: string | number;
  readonly entityType: string;
  readonly action: string;
  readonly actor: string | number;
  readonly metadata: Readonly<Record<string, any>>;

  constructor(props: {
    entityId: string | number;
    entityType: string;
    action: string;
    actor: string | number;
    metadata?: Record<string, any>;
  }) {
    if (!props.entityId) throw new Error('LifecycleContext requires entityId');
    if (!props.entityType) throw new Error('LifecycleContext requires entityType');
    if (!props.action) throw new Error('LifecycleContext requires action');
    if (!props.actor) throw new Error('LifecycleContext requires actor');

    this.entityId = props.entityId;
    this.entityType = props.entityType;
    this.action = props.action;
    this.actor = props.actor;
    this.metadata = Object.freeze({ ...(props.metadata || {}) });

    Object.freeze(this);
  }

  /**
   * Convert to object
   */
  toObject(): Record<string, any> {
    return {
      entityId: this.entityId,
      entityType: this.entityType,
      action: this.action,
      actor: this.actor,
      metadata: { ...this.metadata },
    };
  }
}
