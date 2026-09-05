export type EventStatus = 'planned' | 'ongoing' | 'completed' | 'cancelled';
export type RSVPStatus = 'attending' | 'absent' | 'maybe';

export interface EventItem {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  event_date?: string;
  location?: string;
  status: EventStatus;
  attachment_url?: string;
  report_url?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  budget?: EventBudget;
  participants?: EventParticipant[];
}

export interface EventBudget {
  id?: string;
  event_id?: string;
  description: string;
  estimated_cost: number;
  actual_cost: number;
  planned_amount?: number;
  actual_amount?: number;
  created_at?: string;
  updated_at?: string;
}

export interface EventParticipant {
  id?: string;
  event_id?: string;
  resident_id: string;
  status: RSVPStatus;
  created_at?: string;
  updated_at?: string;
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  event_date?: string;
  location?: string;
  status?: EventStatus;
  attachment_url?: string;
  report_url?: string;
}

export interface UpdateEventPayload {
  title?: string;
  description?: string;
  event_date?: string;
  location?: string;
  status?: EventStatus;
  attachment_url?: string;
  report_url?: string;
}

export interface EventFilter {
  status?: string;
  limit?: number;
  offset?: number;
}
