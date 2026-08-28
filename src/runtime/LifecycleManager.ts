import { LifecycleHandler, LifecycleHandlerImpl } from './LifecycleHandler';
import { LifecycleEvent } from './LifecycleEvent';
import { LifecycleContext } from './LifecycleContext';

/**
 * LifecycleManager
 * Manages lifecycle handlers and event dispatch
 * Handlers execute in priority order (highest first)
 * Handlers are observational (cannot prevent execution)
 */
export class LifecycleManager {
  private handlerMap: Map<string, LifecycleHandler> = new Map();
  private eventHandlerIndex: Map<string, Set<string>> = new Map(); // event name → handler IDs

  /**
   * Register a handler
   */
  register(handler: LifecycleHandler): this {
    if (!handler) throw new Error('Cannot register null handler');
    if (this.handlerMap.has(handler.id)) {
      throw new Error(`Handler with id '${handler.id}' already registered`);
    }

    this.handlerMap.set(handler.id, handler);

    // Index handler by supported events
    for (const eventName of handler.supportedEvents) {
      if (!this.eventHandlerIndex.has(eventName)) {
        this.eventHandlerIndex.set(eventName, new Set());
      }
      this.eventHandlerIndex.get(eventName)!.add(handler.id);
    }

    return this;
  }

  /**
   * Unregister a handler
   */
  unregister(handlerId: string): this {
    const handler = this.handlerMap.get(handlerId);
    if (!handler) {
      throw new Error(`Handler with id '${handlerId}' not found`);
    }

    this.handlerMap.delete(handlerId);

    // Remove from event index
    for (const eventName of handler.supportedEvents) {
      const handlerIds = this.eventHandlerIndex.get(eventName);
      if (handlerIds) {
        handlerIds.delete(handlerId);
        if (handlerIds.size === 0) {
          this.eventHandlerIndex.delete(eventName);
        }
      }
    }

    return this;
  }

  /**
   * Check if handler exists
   */
  exists(handlerId: string): boolean {
    return this.handlerMap.has(handlerId);
  }

  /**
   * Check if handler is enabled
   */
  isEnabled(handlerId: string): boolean {
    const handler = this.handlerMap.get(handlerId);
    if (!handler) return false;
    return handler.enabled;
  }

  /**
   * Check if handler is disabled
   */
  isDisabled(handlerId: string): boolean {
    const handler = this.handlerMap.get(handlerId);
    if (!handler) return false;
    return !handler.enabled;
  }

  /**
   * Get all handlers, optionally filtered by event name
   */
  getHandlers(eventName?: string): LifecycleHandler[] {
    if (eventName) {
      const handlerIds = this.eventHandlerIndex.get(eventName) || new Set();
      const result: LifecycleHandler[] = [];
      for (const id of handlerIds) {
        const handler = this.handlerMap.get(id);
        if (handler) {
          result.push(handler);
        }
      }
      // Sort by priority descending (higher priority first)
      return result.sort((a, b) => b.priority - a.priority);
    }

    // Return all handlers sorted by priority
    const result = Array.from(this.handlerMap.values());
    return result.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get supported event names
   */
  supportedEvents(): string[] {
    return Array.from(this.eventHandlerIndex.keys());
  }

  /**
   * Get total handler count
   */
  count(): number {
    return this.handlerMap.size;
  }

  /**
   * Check if any handlers are registered
   */
  hasHandlers(): boolean {
    return this.handlerMap.size > 0;
  }

  /**
   * Check if handlers exist for specific event
   */
  hasHandlersFor(eventName: string): boolean {
    const handlerIds = this.eventHandlerIndex.get(eventName);
    return !!handlerIds && handlerIds.size > 0;
  }

  /**
   * Get handler count for specific event
   */
  handlerCountFor(eventName: string): number {
    const handlerIds = this.eventHandlerIndex.get(eventName) || new Set();
    return handlerIds.size;
  }

  /**
   * Dispatch an event to all matching handlers
   * Handlers execute in priority order
   * If any handler throws, the exception is propagated with context preserved
   */
  async dispatch(event: LifecycleEvent, context: LifecycleContext): Promise<void> {
    const handlers = this.getHandlers(event.name);

    for (const handler of handlers) {
      if (!handler.enabled) continue;

      try {
        await handler.callable(event, context);
      } catch (error) {
        // Preserve original error information
        const originalError = error instanceof Error ? error : new Error(String(error));
        const enhancedError = new Error(
          `Lifecycle handler '${handler.id}' failed: ${originalError.message}`
        );
        
        // Preserve original stack trace
        if (originalError.stack) {
          enhancedError.stack = `${enhancedError.message}\nCaused by: ${originalError.stack}`;
        }
        
        throw enhancedError;
      }
    }
  }

  /**
   * Clear all handlers
   */
  clear(): this {
    this.handlerMap.clear();
    this.eventHandlerIndex.clear();
    return this;
  }

  /**
   * Register a simple handler with callback
   * Convenience method
   */
  registerCallback(props: {
    id: string;
    callback: (event: LifecycleEvent, context: LifecycleContext) => Promise<void>;
    events: string[];
    priority?: number;
    enabled?: boolean;
  }): this {
    const handler = new LifecycleHandlerImpl({
      id: props.id,
      callable: props.callback,
      supportedEvents: props.events,
      priority: props.priority,
      enabled: props.enabled,
    });
    return this.register(handler);
  }
}
