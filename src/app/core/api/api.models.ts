export type MembershipRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';

export interface CurrentUser {
  userId: string;
  email: string | null;
  displayName: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  authentication: {
    sessionId: string | null;
    authenticationLevel: string | null;
    issuedAt: string | null;
    expiresAt: string | null;
  };
}

export interface OrganizationOption {
  organizationId: string;
  organizationName: string;
  membershipId: string;
  role: MembershipRole;
  farmScopeMode: string;
}

export interface FarmOption {
  farmId: string;
  farmName: string;
}

export interface TenantContextResponse {
  userId: string;
  organization: { id: string; name: string };
  farm: { id: string; name: string };
  membership: { id: string; role: MembershipRole; farmScopeMode: string };
}

export interface ItemsResponse<T> { items: T[] }

export interface ValidationError { field: string; message: string }

export type ApiErrorKind = 'validation' | 'unauthorized' | 'forbidden' | 'not-found' | 'conflict' | 'rate-limited' | 'unavailable' | 'unexpected';

export class AppError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly requestId?: string,
    public readonly validationErrors: ValidationError[] = [],
  ) {
    super(message);
    this.name = 'AppError';
  }
}
