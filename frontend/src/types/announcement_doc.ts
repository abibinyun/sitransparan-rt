export type AnnouncementTarget = 'ALL' | 'RESIDENTS_ONLY';

export interface Announcement {
  id: string;
  tenant_id: string;
  title: string;
  content: string;
  attachment_url?: string;
  target: AnnouncementTarget;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAnnouncementPayload {
  title: string;
  content: string;
  attachment_url?: string;
  target?: AnnouncementTarget;
}

export interface UpdateAnnouncementPayload {
  title?: string;
  content?: string;
  attachment_url?: string;
  target?: AnnouncementTarget;
}

export type DocumentCategory = 'LAPORAN_KEUANGAN' | 'NOTULEN' | 'SURAT' | 'LAINNYA';

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
