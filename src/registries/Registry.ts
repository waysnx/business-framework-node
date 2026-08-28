import { DuplicateError } from '../errors/DuplicateError';
import { NotFoundError } from '../errors/NotFoundError';

/**
 * Registry
 * Generic base class for artifact registries
 * Implements universal pattern: register, unregister, findById, findByName, etc.
 */
export abstract class Registry<T extends { id: string; name: string }> {
  protected definitions: Map<string, T> = new Map();
  protected nameIndex: Map<string, string> = new Map(); // name → id
  protected aliasIndex: Map<string, string> = new Map(); // alias → id

  /**
   * Get the type name for error messages
   */
  protected abstract getTypeName(): string;

  /**
   * Register a definition
   */
  register(definition: T): this {
    if (!definition) throw new Error('Cannot register null or undefined definition');
    if (!definition.id) throw new Error('Definition must have id');
    if (!definition.name) throw new Error('Definition must have name');

    // Check for duplicate ID
    if (this.definitions.has(definition.id)) {
      throw new DuplicateError(this.getTypeName(), definition.id);
    }

    // Check for duplicate name
    if (this.nameIndex.has(definition.name)) {
      const existingId = this.nameIndex.get(definition.name)!;
      if (existingId !== definition.id) {
        throw new DuplicateError(`${this.getTypeName()} name`, definition.name);
      }
    }

    this.beforeRegister(definition);

    this.definitions.set(definition.id, definition);
    this.nameIndex.set(definition.name, definition.id);

    this.afterRegister(definition);

    return this;
  }

  /**
   * Unregister a definition by ID
   */
  unregister(id: string): this {
    const definition = this.definitions.get(id);
    if (!definition) {
      throw new NotFoundError(this.getTypeName(), id);
    }

    this.beforeUnregister(definition);

    this.definitions.delete(id);
    this.nameIndex.delete(definition.name);

    // Remove any aliases
    const aliasesToRemove: string[] = [];
    for (const [alias, aliasId] of this.aliasIndex) {
      if (aliasId === id) {
        aliasesToRemove.push(alias);
      }
    }
    aliasesToRemove.forEach((alias) => this.aliasIndex.delete(alias));

    this.afterUnregister(definition);

    return this;
  }

  /**
   * Find definition by ID
   */
  findById(id: string): T {
    const definition = this.definitions.get(id);
    if (!definition) {
      throw new NotFoundError(this.getTypeName(), id);
    }
    return definition;
  }

  /**
   * Find definition by name
   */
  findByName(name: string): T {
    const id = this.nameIndex.get(name);
    if (!id) {
      throw new NotFoundError(`${this.getTypeName()} with name`, name);
    }
    return this.definitions.get(id)!;
  }

  /**
   * Find definition by alias
   */
  findByAlias(alias: string): T {
    const id = this.aliasIndex.get(alias);
    if (!id) {
      throw new NotFoundError(`${this.getTypeName()} with alias`, alias);
    }
    return this.definitions.get(id)!;
  }

  /**
   * Get all definitions as Map
   */
  all(): Map<string, T> {
    return new Map(this.definitions);
  }

  /**
   * Get count of registered definitions
   */
  count(): number {
    return this.definitions.size;
  }

  /**
   * Check if definition exists by ID
   */
  exists(id: string): boolean {
    return this.definitions.has(id);
  }

  /**
   * Check if name is registered
   */
  nameExists(name: string): boolean {
    return this.nameIndex.has(name);
  }

  /**
   * Check if alias is registered
   */
  aliasExists(alias: string): boolean {
    return this.aliasIndex.has(alias);
  }

  /**
   * Register an alias for a definition
   */
  alias(id: string, alias: string): this {
    if (!this.definitions.has(id)) {
      throw new NotFoundError(this.getTypeName(), id);
    }

    if (this.aliasIndex.has(alias) && this.aliasIndex.get(alias) !== id) {
      throw new DuplicateError(`${this.getTypeName()} alias`, alias);
    }

    this.aliasIndex.set(alias, id);
    return this;
  }

  /**
   * Remove an alias
   */
  removeAlias(alias: string): this {
    this.aliasIndex.delete(alias);
    return this;
  }

  /**
   * Get all aliases for a definition
   */
  getAliasesFor(id: string): string[] {
    if (!this.definitions.has(id)) {
      throw new NotFoundError(this.getTypeName(), id);
    }

    const aliases: string[] = [];
    for (const [alias, aliasId] of this.aliasIndex) {
      if (aliasId === id) {
        aliases.push(alias);
      }
    }
    return aliases;
  }

  /**
   * Clear all registrations
   */
  clear(): this {
    this.definitions.clear();
    this.nameIndex.clear();
    this.aliasIndex.clear();
    return this;
  }

  /**
   * Hook: called before registration
   */
  protected beforeRegister(_definition: T): void {
    // Override in subclasses if needed
  }

  /**
   * Hook: called after registration
   */
  protected afterRegister(_definition: T): void {
    // Override in subclasses if needed
  }

  /**
   * Hook: called before unregistration
   */
  protected beforeUnregister(_definition: T): void {
    // Override in subclasses if needed
  }

  /**
   * Hook: called after unregistration
   */
  protected afterUnregister(_definition: T): void {
    // Override in subclasses if needed
  }
}
