import { LifecycleEvent } from './LifecycleEvent';
import { LifecycleContext } from './LifecycleContext';

/**
 * LifecycleHandler
 * Handler for lifecycle events
 * Handlers are observational (cannot prevent execution)
 */
export interface LifecycleHandler {
  id: string;
  callable: (event: LifecycleEvent, context: LifecycleContext) => Promise<void>;
  supportedEvents: readonly string[];
  /** Higher = executes earlier. Default when omitted: 0. */
  priority?: number;
  /**
   * Whether the handler is dispatched. Default when omitted: true (enabled),
   * matching LifecycleHandlerImpl, registerCallback() and the Laravel runtime.
   * Only an explicit `false` disables a handler. Non-boolean values are
   * rejected by LifecycleManager.register() (NOD-07).
   */
  enabled?: boolean;
}

/**
 * Effective enabled state of a handler (unspecified ⇒ enabled).
 */
export function isHandlerEnabled(handler: LifecycleHandler): boolean {
  return handler.enabled !== false;
}

/**
 * Effective priority of a handler (unspecified ⇒ 0).
 */
export function handlerPriority(handler: LifecycleHandler): number {
  return typeof handler.priority === 'number' ? handler.priority : 0;
}

/**
 * LifecycleHandlerImpl
 * Default implementation of LifecycleHandler
 */
export class LifecycleHandlerImpl implements LifecycleHandler {
  readonly id: string;
  readonly callable: (event: LifecycleEvent, context: LifecycleContext) => Promise<void>;
  readonly supportedEvents: readonly string[];
  readonly priority: number;
  enabled: boolean;

  constructor(props: {
    id: string;
    callable: (event: LifecycleEvent, context: LifecycleContext) => Promise<void>;
    supportedEvents: string[];
    priority?: number;
    enabled?: boolean;
  }) {
    if (!props.id) throw new Error('LifecycleHandler requires id');
    if (!props.callable) throw new Error('LifecycleHandler requires callable');
    if (!props.supportedEvents || props.supportedEvents.length === 0) {
      throw new Error('LifecycleHandler requires at least one supportedEvent');
    }

    this.id = props.id;
    this.callable = props.callable;
    this.supportedEvents = Object.freeze([...props.supportedEvents]);
    this.priority = props.priority || 0;
    this.enabled = props.enabled !== false;
  }
}
