export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      employees: {
        Row: {
          id: string
          employee_id: string
          name: string
          hourly_rate: string
          transport_allowance: string | null
          daily_rate: string | null
          weekly_rate: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          name: string
          hourly_rate: string | number
          transport_allowance?: string | number | null
          daily_rate?: string | number | null
          weekly_rate?: string | number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          name?: string
          hourly_rate?: string | number
          transport_allowance?: string | number | null
          daily_rate?: string | number | null
          weekly_rate?: string | number | null
          created_at?: string | null
        }
      }
      attendance: {
        Row: {
          id: string
          employee_id: string
          date: string
          day_of_week: string
          check_in: string | null
          check_out: string | null
          hours_worked: string | null
          overtime_hours: string | null
          daily_wage: string | null
          is_carried_over: boolean | null
          carried_over_amount: string | null
          week_start_date: string
          created_at: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          date: string
          day_of_week: string
          check_in?: string | null
          check_out?: string | null
          hours_worked?: string | number | null
          overtime_hours?: string | number | null
          daily_wage?: string | number | null
          is_carried_over?: boolean | null
          carried_over_amount?: string | number | null
          week_start_date: string
          created_at?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          date?: string
          day_of_week?: string
          check_in?: string | null
          check_out?: string | null
          hours_worked?: string | number | null
          overtime_hours?: string | number | null
          daily_wage?: string | number | null
          is_carried_over?: boolean | null
          carried_over_amount?: string | number | null
          week_start_date?: string
          created_at?: string | null
        }
      }
      week_hour_adjustments: {
        Row: {
          id: string
          employee_id: string
          week_start_date: string
          kind: string
          hours: string
          note: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          week_start_date: string
          kind: string
          hours: string | number
          note?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          week_start_date?: string
          kind?: string
          hours?: string | number
          note?: string | null
          created_at?: string | null
        }
      }
      manual_transfers: {
        Row: {
          id: string
          employee_id: string
          source_week_start: string
          target_week_start: string
          amount: string
          note: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          source_week_start: string
          target_week_start: string
          amount: string | number
          note?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          source_week_start?: string
          target_week_start?: string
          amount?: string | number
          note?: string | null
          created_at?: string | null
        }
      }
    }
  }
}
