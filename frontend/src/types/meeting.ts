export interface MeetingAttendee {
  id: string;
  meeting_id: string;
  resident_id?: string;
  name: string;
  role_or_title: string;
  attended: boolean;
  notes?: string;
  created_at: string;
}

export interface MeetingDecision {
  id: string;
  meeting_id: string;
  decision_text: string;
  category: string;
  created_at: string;
}

export interface MeetingActionItem {
  id: string;
  meeting_id: string;
  task: string;
  assignee_name: string;
  assignee_resident_id?: string;
  due_date?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: string;
  title: string;
  agenda: string;
  meeting_date: string;
  location: string;
  meeting_type: 'regular' | 'emergency' | 'karang_taruna' | 'rtrw_pleno';
  visibility: 'public' | 'internal' | 'confidential';
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  attendees?: MeetingAttendee[];
  decisions?: MeetingDecision[];
  action_items?: MeetingActionItem[];
}

export interface CreateMeetingDTO {
  title: string;
  agenda: string;
  meeting_date: string;
  location: string;
  meeting_type: string;
  visibility: string;
  status: string;
  notes?: string;
}

export interface AddAttendeeDTO {
  resident_id?: string;
  name: string;
  role_or_title?: string;
  attended?: boolean;
  notes?: string;
}

export interface AddDecisionDTO {
  decision_text: string;
  category?: string;
}

export interface CreateActionItemDTO {
  meeting_id: string;
  task: string;
  assignee_name: string;
  assignee_resident_id?: string;
  due_date?: string;
  status?: string;
  notes?: string;
}
