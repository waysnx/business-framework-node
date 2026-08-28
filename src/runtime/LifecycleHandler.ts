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
  priority: number; // Higher = executes earlier
  enabled: boolean;
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
