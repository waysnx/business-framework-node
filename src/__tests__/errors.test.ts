import {
  WBFError,
  RegistryError,
  DuplicateError,
  NotFoundError,
  ValidationError,
  AuthorizationError,
  BusinessRuleViolation,
  ResourceNotFound,
  ConflictError,
} from '../errors';

describe('Error Hierarchy', () => {
  describe('WBFError', () => {
    it('creates error with message, category, and context', () => {
      const error = new WBFError('Test error', 'TestCategory', { detail: 'info' });
      expect(error.message).toBe('Test error');
      expect(error.category).toBe('TestCategory');
      expect(error.context).toEqual({ detail: 'info' });
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('serializes to JSON', () => {
      const error = new WBFError('Test error', 'TestCategory', { detail: 'info' });
      const json = error.toJSON();
      expect(json.message).toBe('Test error');
      expect(json.category).toBe('TestCategory');
      expect(json.context).toEqual({ detail: 'info' });
      expect(typeof json.timestamp).toBe('string');
    });

    it('maintains instanceof relationship', () => {
      const error = new WBFError('Test', 'Test');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof WBFError).toBe(true);
    });
  });

  describe('DuplicateError', () => {
    it('creates duplicate error with item type and ID', () => {
      const error = new DuplicateError('Entity', 'entity-001');
      expect(error.message).toBe("Entity 'entity-001' already registered");
      expect(error.category).toBe('RegistryError');
      expect(error.itemType).toBe('Entity');
      expect(error.itemId).toBe('entity-001');
    });

    it('maintains instanceof chain', () => {
      const error = new DuplicateError('Entity', 'entity-001');
      expect(error instanceof DuplicateError).toBe(true);
      expect(error instanceof RegistryError).toBe(true);
      expect(error instanceof WBFError).toBe(true);
    });
  });

  describe('NotFoundError', () => {
    it('creates not found error with item type and ID', () => {
      const error = new NotFoundError('Entity', 'entity-001');
      expect(error.message).toBe("Entity 'entity-001' not found");
      expect(error.category).toBe('RegistryError');
      expect(error.itemType).toBe('Entity');
      expect(error.itemId).toBe('entity-001');
    });
  });

  describe('ValidationError', () => {
    it('creates validation error', () => {
      const error = new ValidationError('Invalid entity', { field: 'email' });
      expect(error.message).toBe('Invalid entity');
      expect(error.category).toBe('ValidationError');
      expect(error.context).toEqual({ field: 'email' });
    });
  });

  describe('AuthorizationError', () => {
    it('creates authorization error', () => {
      const error = new AuthorizationError('Access denied');
      expect(error.message).toBe('Access denied');
      expect(error.category).toBe('AuthorizationError');
    });
  });

  describe('BusinessRuleViolation', () => {
    it('creates business rule violation', () => {
      const error = new BusinessRuleViolation('Leave balance insufficient');
      expect(error.message).toBe('Leave balance insufficient');
      expect(error.category).toBe('BusinessRuleViolation');
    });
  });

  describe('ResourceNotFound', () => {
    it('creates resource not found error', () => {
      const error = new ResourceNotFound('Employee', 'emp-001');
      expect(error.message).toBe("Employee 'emp-001' not found");
      expect(error.category).toBe('ResourceNotFound');
      expect(error.resourceType).toBe('Employee');
      expect(error.resourceId).toBe('emp-001');
    });
  });

  describe('ConflictError', () => {
    it('creates conflict error', () => {
      const error = new ConflictError('Entity already processed');
      expect(error.message).toBe('Entity already processed');
      expect(error.category).toBe('Conflict');
    });
  });
});
