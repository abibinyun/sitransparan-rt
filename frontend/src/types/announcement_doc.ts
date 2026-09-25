// Lowercase values match the backend/DB enum (target IN ('all','residents_only')).
export type AnnouncementTarget = 'all' | 'residents_only';

export type AnnouncementCategory = 'pengumuman' | 'kegiatan' | 'santai' | 'info';

export interface Announcement {
  id: string;
  tenant_id: string;
  title: string;
  content: string;
  attachment_url?: string;
  media_urls?: string[];
  file_urls?: string[];
  category: AnnouncementCategory | string;
  target: AnnouncementTarget;
  allow_comments?: boolean;
  comments_count?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAnnouncementPayload {
  title: string;
  content: string;
  attachment_url?: string;
  media_urls?: string[];
  file_urls?: string[];
  category?: AnnouncementCategory | string;
  target?: AnnouncementTarget;
  allow_comments?: boolean;
  created_at?: string;
}

export interface UpdateAnnouncementPayload {
  title?: string;
  content?: string;
  attachment_url?: string;
  media_urls?: string[];
  file_urls?: string[];
  category?: AnnouncementCategory | string;
  target?: AnnouncementTarget;
  allow_comments?: boolean;
  created_at?: string;
}

export interface AnnouncementComment {
  id: string;
  announcement_id: string;
  user_id: string;
  author_name: string;
  house_block?: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// Lowercase values match the backend/DB enum (financial_report|minutes|letter|other).
export type DocumentCategory = 'financial_report' | 'minutes' | 'letter' | 'other';

export interface Document {
  id: string;
  tenant_id: string;
  title: string;
  category: DocumentCategory | string;
  file_url: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDocumentPayload {
  title: string;
  category: DocumentCategory | string;
  file_url: string;
}

export interface UpdateDocumentPayload {
  title?: string;
  category?: DocumentCategory | string;
  file_url?: string;
}
