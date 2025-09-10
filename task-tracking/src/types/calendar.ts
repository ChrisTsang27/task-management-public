export interface EventCategory {
  id: string;
  name: string;
  color: string; // Hex color code
  description?: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  start_date: string; // ISO string
  end_date: string; // ISO string
  all_day: boolean;
  category_id: string | null;
  team_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEventData {
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
  category_id?: string;
  team_id?: string;
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  all_day?: boolean;
  category_id?: string;
  team_id?: string;
}