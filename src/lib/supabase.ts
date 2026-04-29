import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Team = {
  id: string;
  factory_id: string;
  name: string;
  code: string;
  sort_order: number;
};

export type Wig = {
  id: string;
  team_id: string;
  description: string;
  baseline_value: number | null;
  target_value: number;
  unit: string;
  direction: 'ge' | 'le';
  deadline: string | null;
  deadline_label: string | null;
  is_active: boolean;
};

export type IndicatorType = 'lead' | 'lag' | 'general';

export type MetricDef = {
  id: string;
  team_id: string;
  name: string;
  unit: string;
  target_value: number;
  direction: 'ge' | 'le';
  is_lead_indicator: boolean;
  indicator_type: IndicatorType;
  sort_order: number;
  is_active: boolean;
  owner_user_id: string | null;
};

export type DailyEntry = {
  id: string;
  metric_def_id: string;
  entry_date: string;
  value: number | null;
};

export type Practice = {
  id: string;
  team_id: string;
  description: string;
  week_key: string;
  is_completed: boolean;
  sort_order: number;
  owner_user_id: string | null;
};

export type User = {
  id: string;
  email: string;
  name: string;
  team_id: string | null;
};
