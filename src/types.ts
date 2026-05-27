export interface CustomerManager {
  id: number;
  name: string;
  phone: string | null;
}

export interface ActivityTheme {
  id: number;
  title: string;
  event_date: string;
  slug: string;
  is_active: boolean;
  access_code: string | null;
  registration_deadline: string | null;
}

export interface SubActivity {
  id: number;
  theme_id: number;
  title: string;
  start_date: string;
  end_date: string | null;
  max_capacity: number;
}

export interface SubActivityWithCounts extends SubActivity {
  confirmed_count: number;
  waitlist_count: number;
}

export interface Registration {
  id: number;
  name: string;
  phone: string;
  sub_activity_ids: number[];
  customer_manager_id: number | null;
  parent_id: number | null;
  theme_id: number;
  status: 'confirmed' | 'waitlist';
  registered_at: string;
}

export interface CompanionInput {
  tempId: string;
  name: string;
  phone: string;
  selectedSubIds: number[];
}

export interface RegistrationResult {
  id: number;
  name: string;
  status: 'confirmed' | 'waitlist';
  role: 'main' | 'companion';
}

export interface SubmitResponse {
  success: boolean;
  records: RegistrationResult[];
}
