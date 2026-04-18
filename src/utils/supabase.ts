import { createClient } from '@supabase/supabase-js'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string, full_name: string | null, email: string, role: 'admin' | 'member', is_approved: boolean | null, blood_group: string | null, created_at: string }
        Insert: { id: string, full_name?: string | null, email: string, role?: 'admin' | 'member', is_approved?: boolean | null, blood_group?: string | null, created_at?: string }
        Update: { id?: string, full_name?: string | null, email?: string, role?: 'admin' | 'member', is_approved?: boolean | null, blood_group?: string | null, created_at?: string }
      }
      events: {
        Row: { id: string, title: string, description: string | null, type: 'general' | 'fund_tracker' | 'random_picker', event_date: string, status: 'open' | 'active' | 'completed', visibility: 'public' | 'private', target_amount: number | null, created_by: string, created_at: string }
        Insert: { id?: string, title: string, description?: string | null, type: 'general' | 'fund_tracker' | 'random_picker', event_date?: string, status?: 'open' | 'active' | 'completed', visibility?: 'public' | 'private', target_amount?: number | null, created_by: string, created_at?: string }
        Update: { id?: string, title?: string, description?: string | null, type?: 'general' | 'fund_tracker' | 'random_picker', event_date?: string, status?: 'open' | 'active' | 'completed', visibility?: 'public' | 'private', target_amount?: number | null, created_by?: string, created_at?: string }
      }
      event_subscribers: {
        Row: { event_id: string, user_id: string, event_role: 'captain' | 'co-captain' | 'member', joined_at: string }
        Insert: { event_id: string, user_id: string, event_role?: 'captain' | 'co-captain' | 'member', joined_at?: string }
        Update: { event_id?: string, user_id?: string, event_role?: 'captain' | 'co-captain' | 'member', joined_at?: string }
      }
      event_funds: {
        Row: { id: string, event_id: string, user_id: string, amount: number, month: number, year: number, status: 'pending' | 'paid', created_at: string }
        Insert: { id?: string, event_id: string, user_id: string, amount: number, month: number, year: number, status?: 'pending' | 'paid', created_at?: string }
        Update: { id?: string, event_id?: string, user_id?: string, amount?: number, month?: number, year?: number, status?: 'pending' | 'paid', created_at?: string }
      }
      event_activities: {
        Row: { id: string, event_id: string, activity_type: string, payload: any | null, created_at: string }
        Insert: { id?: string, event_id: string, activity_type: string, payload?: any | null, created_at?: string }
        Update: { id?: string, event_id?: string, activity_type?: string, payload?: any | null, created_at?: string }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_own_profile: {
        Args: {
          p_full_name: string | null
          p_blood_group: string | null
        }
        Returns: Database['public']['Tables']['profiles']['Row']
      }
      approve_user: {
        Args: {
          p_user_id: string
        }
        Returns: Database['public']['Tables']['profiles']['Row']
      }
      promote_user_to_admin: {
        Args: {
          p_user_id: string
        }
        Returns: Database['public']['Tables']['profiles']['Row']
      }
      create_event_with_captain: {
        Args: {
          p_title: string
          p_description: string | null
          p_type: 'general' | 'fund_tracker' | 'random_picker'
          p_visibility: 'public' | 'private'
          p_event_date: string
          p_target_amount?: number | null
        }
        Returns: Database['public']['Tables']['events']['Row']
      }
      join_public_event: {
        Args: {
          p_event_id: string
        }
        Returns: Database['public']['Tables']['event_subscribers']['Row']
      }
      promote_event_member_to_cocaptain: {
        Args: {
          p_event_id: string
          p_user_id: string
        }
        Returns: Database['public']['Tables']['event_subscribers']['Row']
      }
      demote_event_member_to_member: {
        Args: {
          p_event_id: string
          p_user_id: string
        }
        Returns: Database['public']['Tables']['event_subscribers']['Row']
      }
      remove_event_member: {
        Args: {
          p_event_id: string
          p_user_id: string
        }
        Returns: Database['public']['Tables']['event_subscribers']['Row']
      }
      upsert_event_fund_payment: {
        Args: {
          p_event_id: string
          p_user_id: string
          p_amount: number
          p_month: number
          p_year: number
        }
        Returns: Database['public']['Tables']['event_funds']['Row']
      }
      spin_random_picker: {
        Args: {
          p_event_id: string
          p_amount: number
        }
        Returns: Database['public']['Tables']['event_activities']['Row']
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

function getRequiredEnvVar(name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY') {
  const processValue =
    typeof process !== 'undefined' ? process.env?.[name] : undefined
  const viteValue = import.meta.env?.[name]
  const value = processValue || viteValue

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

const supabaseUrl = getRequiredEnvVar('VITE_SUPABASE_URL')
const supabaseAnonKey = getRequiredEnvVar('VITE_SUPABASE_ANON_KEY')

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
