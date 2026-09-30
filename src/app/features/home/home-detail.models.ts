import type { HomeMetricKind } from '../../design-system/patterns/metric-deck';
import type { PendingWorkType } from '../herd/herd-operations.models';
import type { OperationalUrgency } from './operational-urgency';

export type HomeActivityKind = 'movements' | 'weights' | 'treatments' | 'breedings' | 'calvings' | 'births';
export type HomeDetailRequest =
  | { kind: 'metric'; metric: HomeMetricKind }
  | { kind: 'pending'; pendingType: PendingWorkType; title: string }
  | { kind: 'urgency'; item: OperationalUrgency }
  | { kind: 'agenda-day'; date: string }
  | { kind: 'activity'; activity: HomeActivityKind };
