// Database types for Supabase
// These match the schema in supabase/migrations/001_initial_schema.sql

export type MarketPhase = 'hot' | 'balanced' | 'soft';
export type CMAStatus = 'pending' | 'contacted' | 'completed' | 'cancelled';
export type ContactMethod = 'email' | 'phone' | 'either';

export interface Session {
  id: string;
  created_at: string;
  last_activity: string;
  user_agent?: string;
  ip_hash?: string;
  metadata: Record<string, unknown>;
}

export interface Estimate {
  id: string;
  session_id: string;
  
  // Input data
  address: string;
  address_components?: {
    street_number?: string;
    street_name?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    country?: string;
  };
  purchase_year: number;
  purchase_month: number;
  purchase_price: number;
  down_payment_percent: number;
  
  // Calculated values - Home Value
  estimated_value_low: number;
  estimated_value_mid: number;
  estimated_value_high: number;
  
  // Calculated values - Equity
  estimated_equity_low: number;
  estimated_equity_mid: number;
  estimated_equity_high: number;
  
  // Mortgage details
  remaining_mortgage: number;
  original_loan_amount: number;
  interest_rate_used: number;
  
  // Market context
  market_phase: MarketPhase;
  purchase_index: number;
  
  // Metadata
  created_at: string;
  calculation_version: string;
}

export interface CMARequest {
  id: string;
  estimate_id?: string;
  session_id?: string;
  
  // Contact info
  name: string;
  email: string;
  phone?: string;
  
  // Request details
  preferred_contact_method: ContactMethod;
  notes?: string;
  
  // Status tracking
  status: CMAStatus;
  contacted_at?: string;
  
  // Metadata
  created_at: string;
}

export interface BookingEvent {
  id: string;
  estimate_id?: string;
  session_id?: string;
  calendly_event_id?: string;
  scheduled_time?: string;
  clicked_at: string;
  created_at: string;
}

// Market HPI (Home Price Index) data
export interface MarketHPI {
  id: string;
  report_month: string;
  area_name: string;
  property_category: string;
  hpi_index: number | null;
  benchmark_price: number | null;
  created_at: string;
}

export interface MarketHPIInsert {
  report_month: string;
  area_name: string;
  property_category: string;
  hpi_index?: number;
  benchmark_price?: number;
}

// HPI-based estimate (new format)
export interface HPIEstimate {
  id: string;
  session_id: string;
  region: string;
  property_type: string;
  purchase_year: number;
  purchase_month: number;
  purchase_price: number;
  hpi_at_purchase: number;
  hpi_current: number;
  hpi_current_date: string;
  appreciation_factor: number;
  estimated_current_value: number;
  equity_gained: number;
  roi_percent: number;
  created_at: string;
}

export interface HPIEstimateInsert {
  session_id: string;
  region: string;
  property_type: string;
  purchase_year: number;
  purchase_month: number;
  purchase_price: number;
  hpi_at_purchase: number;
  hpi_current: number;
  hpi_current_date: string;
  appreciation_factor: number;
  estimated_current_value: number;
  equity_gained: number;
  roi_percent: number;
}

// Insert types (without auto-generated fields)
export interface SessionInsert {
  user_agent?: string;
  ip_hash?: string;
  metadata?: Record<string, unknown>;
}

export interface EstimateInsert {
  session_id: string;
  address: string;
  address_components?: Estimate['address_components'];
  purchase_year: number;
  purchase_month?: number;
  purchase_price: number;
  down_payment_percent?: number;
  
  // Calculated values
  estimated_value_low: number;
  estimated_value_mid: number;
  estimated_value_high: number;
  estimated_equity_low: number;
  estimated_equity_mid: number;
  estimated_equity_high: number;
  remaining_mortgage: number;
  original_loan_amount: number;
  interest_rate_used: number;
  market_phase: MarketPhase;
  purchase_index: number;
}

export interface CMARequestInsert {
  estimate_id?: string;
  session_id?: string;
  name: string;
  email: string;
  phone?: string;
  preferred_contact_method?: ContactMethod;
  notes?: string;
}

export interface BookingEventInsert {
  estimate_id?: string;
  session_id?: string;
  calendly_event_id?: string;
  scheduled_time?: string;
}

// Database schema type for Supabase client
export type Database = {
  public: {
    Tables: {
      sessions: {
        Row: Session;
        Insert: SessionInsert;
        Update: Partial<SessionInsert>;
      };
      estimates: {
        Row: Estimate;
        Insert: EstimateInsert;
        Update: Partial<EstimateInsert>;
      };
      cma_requests: {
        Row: CMARequest;
        Insert: CMARequestInsert;
        Update: Partial<CMARequestInsert>;
      };
      booking_events: {
        Row: BookingEvent;
        Insert: BookingEventInsert;
        Update: Partial<BookingEventInsert>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
