import { describe, it, expect } from 'vitest';

export interface NotificationItem {
  id: string;
  user_id?: string;
  title: string;
  body: string;
  category: string;
  action_url: string;
  is_read: boolean;
  created_at: string;
}

export function filterUnread(items: NotificationItem[]): NotificationItem[] {
  return items.filter((n) => !n.is_read);
}

export function getCategoryBadgeTone(category: string): 'red' | 'emerald' | 'blue' | 'amber' | 'slate' {
  switch (category) {
    case 'emergency':
      return 'red';
    case 'dues':
      return 'emerald';
    case 'announcement':
      return 'blue';
    case 'waste':
      return 'amber';
    default:
      return 'slate';
  }
}

describe('Notification Service Logic', () => {
  it('filterUnread hanya mengembalikan notifikasi yang belum dibaca', () => {
    const mockList: NotificationItem[] = [
      { id: '1', title: 'A', body: 'A', category: 'dues', action_url: '/', is_read: false, created_at: '' },
      { id: '2', title: 'B', body: 'B', category: 'waste', action_url: '/', is_read: true, created_at: '' },
    ];
    const unread = filterUnread(mockList);
    expect(unread.length).toBe(1);
    expect(unread[0].id).toBe('1');
  });

  it('getCategoryBadgeTone memberikan warna yang tepat untuk kategori darurat dan kas', () => {
    expect(getCategoryBadgeTone('emergency')).toBe('red');
    expect(getCategoryBadgeTone('dues')).toBe('emerald');
    expect(getCategoryBadgeTone('unknown')).toBe('slate');
  });
});
