import {
  EntityDefinition,
  ModuleDefinition,
  BusinessFunctionDefinition,
  ValidationDefinition,
  WorkflowStep,
  WorkflowDefinition,
} from '../definitions';

describe('Definition Objects - Immutability & Serialization', () => {
  describe('EntityDefinition', () => {
    it('creates and is immutable', () => {
      const def = new EntityDefinition({
        id: 'e1',
        name: 'Employee',
        displayName: 'Employee',
        description: 'Employee',
        moduleId: 'HR',
      });
      expect(def.id).toBe('e1');
      expect(() => {
        // @ts-expect-error
        def.id = 'e2';
      }).toThrow();
    });

    it('serializes correctly', () => {
      const def = new EntityDefinition({
        id: 'e1',
        name: 'Employee',
        displayName: 'Employee',
        description: 'Employee',
        moduleId: 'HR',
        tags: ['core'],
      });
      const obj = def.toObject();
      expect(obj.id).toBe('e1');
      const json = JSON.parse(def.toJson());
      expect(json.tags).toContain('core');
    });
  });

  describe('ModuleDefinition', () => {
    it('creates module', () => {
      const def = new ModuleDefinition({
        id: 'HR',
        name: 'HR',
        displayName: 'HR',
        description: 'HR',
        status: 'Operate',
      });
      expect(def.status).toBe('Operate');
    });
  });

  describe('BusinessFunctionDefinition', () => {
    it('creates business function', () => {
      const def = new BusinessFunctionDefinition({
        id: 'fn1',
        name: 'fn1',
        displayName: 'Function 1',
        description: 'Function 1',
        moduleId: 'MOD',
        domain: 'DOM',
        capability: 'CAP',
      });
      expect(def.moduleId).toBe('MOD');
      expect(def.domain).toBe('DOM');
    });
  });

  describe('ValidationDefinition', () => {
    it('creates validation', () => {
      const def = new ValidationDefinition({
        id: 'v1',
        name: 'val',
        displayName: 'Validation',
        description: 'Validation',
        moduleId: 'MOD',
        scope: 'Entity',
      });
      expect(def.scope).toBe('Entity');
      expect(def.enabled).toBe(true);
    });
  });

  describe('WorkflowStep', () => {
    it('creates step', () => {
      const step = new WorkflowStep({
        id: 's1',
        sequence: 0,
        businessFunctionId: 'fn1',
      });
      expect(step.sequence).toBe(0);
    });

    it('validates sequence', () => {
      expect(() => {
        new WorkflowStep({
          id: 's1',
          sequence: -1,
          businessFunctionId: 'fn1',
        });
      }).toThrow('valid sequence');
    });
  });

  describe('WorkflowDefinition', () => {
    it('creates workflow with steps', () => {
      const step = new WorkflowStep({
        id: 's1',
        sequence: 0,
        businessFunctionId: 'fn1',
      });
      const def = new WorkflowDefinition({
        id: 'wf1',
        name: 'wf1',
        displayName: 'WF',
        description: 'WF',
        moduleId: 'MOD',
        steps: [step],
      });
      expect(def.steps.length).toBe(1);
      const obj = def.toObject();
      expect(obj.steps[0].id).toBe('s1');
    });
  });
});
