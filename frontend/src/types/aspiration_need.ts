export type AspirationCategory = 'suggestion' | 'complaint' | 'question';
export type AspirationStatus = 'submitted' | 'under_review' | 'resolved' | 'rejected';

export interface Aspiration {
  id: string;
  tenant_id: string;
  resident_id?: string;
  title: string;
  content: string;
  category: AspirationCategory;
  status: AspirationStatus;
  is_anonymous: boolean;
  author_name: string;
  response?: string;
  responder_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAspirationPayload {
  title: string;
  content: string;
  category: AspirationCategory;
  author_name?: string;
  is_anonymous?: boolean;
}

export interface UpdateAspirationStatusPayload {
  status: AspirationStatus;
  response?: string;
  responder_name?: string;
}

export type CommunityNeedStatus = 'proposed' | 'approved' | 'in_progress' | 'completed';

export interface CommunityNeed {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  estimated_cost: number;
  status: CommunityNeedStatus;
  progress_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCommunityNeedPayload {
  title: string;
  description?: string;
  estimated_cost: number;
  status?: CommunityNeedStatus;
  progress_notes?: string;
}

export interface UpdateCommunityNeedPayload {
  title?: string;
  description?: string;
  estimated_cost?: number;
  status?: CommunityNeedStatus;
  progress_notes?: string;
}
