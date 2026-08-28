export { WBFError } from './WBFError';
export { RegistryError } from './RegistryError';
export { DuplicateError } from './DuplicateError';
export { NotFoundError } from './NotFoundError';
export { ValidationError } from './ValidationError';
export { AuthorizationError } from './AuthorizationError';
export { BusinessRuleViolation } from './BusinessRuleViolation';
export { ResourceNotFound } from './ResourceNotFound';
export { ConflictError } from './ConflictError';

// Phase 2: Execution Errors
export {
  ExecutionError,
  RequestValidationError,
  ResponseValidationError,
  ExecutionTimeoutError,
  HandlerNotFoundError,
} from './ExecutionError';
