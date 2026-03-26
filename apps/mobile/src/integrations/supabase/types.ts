export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          admin_id: string | null
          created_at: string | null
          description: string | null
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          admin_id?: string | null
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          admin_id?: string | null
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      ad_campaigns: {
        Row: {
          ad_type: string
          approval_status: string
          business_card_id: string | null
          clicks: number
          created_at: string
          creative_url: string | null
          creative_urls: string[] | null
          cta: string | null
          daily_budget: number
          description: string | null
          duration_days: number
          end_date: string | null
          id: string
          impressions: number
          spent: number
          start_date: string
          status: string
          target_age: string | null
          target_city: string | null
          target_interests: string | null
          title: string
          total_budget: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ad_type?: string
          approval_status?: string
          business_card_id?: string | null
          clicks?: number
          created_at?: string
          creative_url?: string | null
          creative_urls?: string[] | null
          cta?: string | null
          daily_budget?: number
          description?: string | null
          duration_days?: number
          end_date?: string | null
          id?: string
          impressions?: number
          spent?: number
          start_date?: string
          status?: string
          target_age?: string | null
          target_city?: string | null
          target_interests?: string | null
          title: string
          total_budget?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ad_type?: string
          approval_status?: string
          business_card_id?: string | null
          clicks?: number
          created_at?: string
          creative_url?: string | null
          creative_urls?: string[] | null
          cta?: string | null
          daily_budget?: number
          description?: string | null
          duration_days?: number
          end_date?: string | null
          id?: string
          impressions?: number
          spent?: number
          start_date?: string
          status?: string
          target_age?: string | null
          target_city?: string | null
          target_interests?: string | null
          title?: string
          total_budget?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_business_card_id_fkey"
            columns: ["business_card_id"]
            isOneToOne: false
            referencedRelation: "business_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_variants: {
        Row: {
          campaign_id: string
          clicks: number
          created_at: string
          creative_url: string
          id: string
          impressions: number
          label: string
        }
        Insert: {
          campaign_id: string
          clicks?: number
          created_at?: string
          creative_url: string
          id?: string
          impressions?: number
          label?: string
        }
        Update: {
          campaign_id?: string
          clicks?: number
          created_at?: string
          creative_url?: string
          id?: string
          impressions?: number
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_variants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_alerts: {
        Row: {
          created_at: string | null
          entity_id: string | null
          id: string
          is_read: boolean | null
          message: string
          severity: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          severity?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          severity?: string | null
          type?: string
        }
        Relationships: []
      }
      admin_metrics_daily: {
        Row: {
          active_ads: number | null
          active_subscriptions: number | null
          created_at: string | null
          flagged_reviews: number | null
          id: string
          metric_date: string
          new_bookings_today: number | null
          new_businesses_today: number | null
          new_users_today: number | null
          open_disputes: number | null
          open_reports: number | null
          open_tickets: number | null
          pending_ads: number | null
          pending_businesses: number | null
          pending_events: number | null
          pending_vouchers: number | null
          revenue_ads: number | null
          revenue_events: number | null
          revenue_subscriptions: number | null
          revenue_vouchers: number | null
          total_ads: number | null
          total_bookings: number | null
          total_businesses: number | null
          total_events: number | null
          total_reviews: number | null
          total_subscriptions: number | null
          total_tickets: number | null
          total_users: number | null
          total_vouchers: number | null
        }
        Insert: {
          active_ads?: number | null
          active_subscriptions?: number | null
          created_at?: string | null
          flagged_reviews?: number | null
          id?: string
          metric_date?: string
          new_bookings_today?: number | null
          new_businesses_today?: number | null
          new_users_today?: number | null
          open_disputes?: number | null
          open_reports?: number | null
          open_tickets?: number | null
          pending_ads?: number | null
          pending_businesses?: number | null
          pending_events?: number | null
          pending_vouchers?: number | null
          revenue_ads?: number | null
          revenue_events?: number | null
          revenue_subscriptions?: number | null
          revenue_vouchers?: number | null
          total_ads?: number | null
          total_bookings?: number | null
          total_businesses?: number | null
          total_events?: number | null
          total_reviews?: number | null
          total_subscriptions?: number | null
          total_tickets?: number | null
          total_users?: number | null
          total_vouchers?: number | null
        }
        Update: {
          active_ads?: number | null
          active_subscriptions?: number | null
          created_at?: string | null
          flagged_reviews?: number | null
          id?: string
          metric_date?: string
          new_bookings_today?: number | null
          new_businesses_today?: number | null
          new_users_today?: number | null
          open_disputes?: number | null
          open_reports?: number | null
          open_tickets?: number | null
          pending_ads?: number | null
          pending_businesses?: number | null
          pending_events?: number | null
          pending_vouchers?: number | null
          revenue_ads?: number | null
          revenue_events?: number | null
          revenue_subscriptions?: number | null
          revenue_vouchers?: number | null
          total_ads?: number | null
          total_bookings?: number | null
          total_businesses?: number | null
          total_events?: number | null
          total_reviews?: number | null
          total_subscriptions?: number | null
          total_tickets?: number | null
          total_users?: number | null
          total_vouchers?: number | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booking_date: string | null
          booking_time: string | null
          business_id: string
          business_name: string
          created_at: string
          customer_name: string
          customer_phone: string
          id: string
          mode: string
          notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_date?: string | null
          booking_time?: string | null
          business_id: string
          business_name: string
          created_at?: string
          customer_name: string
          customer_phone: string
          id?: string
          mode?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_date?: string | null
          booking_time?: string | null
          business_id?: string
          business_name?: string
          created_at?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          mode?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_cards: {
        Row: {
          anniversary: string | null
          approval_status: string
          birthdate: string | null
          business_hours: string | null
          category: string | null
          company_address: string | null
          company_email: string | null
          company_maps_link: string | null
          company_name: string | null
          company_phone: string | null
          created_at: string
          description: string | null
          email: string | null
          established_year: string | null
          facebook: string | null
          full_name: string
          gender: string | null
          home_service: boolean
          id: string
          instagram: string | null
          is_verified: boolean
          job_title: string | null
          keywords: string | null
          latitude: number | null
          linkedin: string | null
          location: string | null
          logo_url: string | null
          longitude: number | null
          maps_link: string | null
          offer: string | null
          phone: string
          service_mode: string
          services: string[] | null
          telegram: string | null
          twitter: string | null
          updated_at: string
          user_id: string
          website: string | null
          whatsapp: string | null
          youtube: string | null
        }
        Insert: {
          anniversary?: string | null
          approval_status?: string
          birthdate?: string | null
          business_hours?: string | null
          category?: string | null
          company_address?: string | null
          company_email?: string | null
          company_maps_link?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          established_year?: string | null
          facebook?: string | null
          full_name: string
          gender?: string | null
          home_service?: boolean
          id?: string
          instagram?: string | null
          is_verified?: boolean
          job_title?: string | null
          keywords?: string | null
          latitude?: number | null
          linkedin?: string | null
          location?: string | null
          logo_url?: string | null
          longitude?: number | null
          maps_link?: string | null
          offer?: string | null
          phone: string
          service_mode?: string
          services?: string[] | null
          telegram?: string | null
          twitter?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Update: {
          anniversary?: string | null
          approval_status?: string
          birthdate?: string | null
          business_hours?: string | null
          category?: string | null
          company_address?: string | null
          company_email?: string | null
          company_maps_link?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          established_year?: string | null
          facebook?: string | null
          full_name?: string
          gender?: string | null
          home_service?: boolean
          id?: string
          instagram?: string | null
          is_verified?: boolean
          job_title?: string | null
          keywords?: string | null
          latitude?: number | null
          linkedin?: string | null
          location?: string | null
          logo_url?: string | null
          longitude?: number | null
          maps_link?: string | null
          offer?: string | null
          phone?: string
          service_mode?: string
          services?: string[] | null
          telegram?: string | null
          twitter?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      business_follows: {
        Row: {
          business_card_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          business_card_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          business_card_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_follows_business_card_id_fkey"
            columns: ["business_card_id"]
            isOneToOne: false
            referencedRelation: "business_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          business_card_id: string
          close_time: string
          created_at: string
          day_of_week: number
          id: string
          is_closed: boolean
          open_time: string
          user_id: string
        }
        Insert: {
          business_card_id: string
          close_time?: string
          created_at?: string
          day_of_week: number
          id?: string
          is_closed?: boolean
          open_time?: string
          user_id: string
        }
        Update: {
          business_card_id?: string
          close_time?: string
          created_at?: string
          day_of_week?: number
          id?: string
          is_closed?: boolean
          open_time?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_business_card_id_fkey"
            columns: ["business_card_id"]
            isOneToOne: false
            referencedRelation: "business_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      business_leads: {
        Row: {
          business_card_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          message: string | null
          phone: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          business_card_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          message?: string | null
          phone?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_card_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          message?: string | null
          phone?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_leads_business_card_id_fkey"
            columns: ["business_card_id"]
            isOneToOne: false
            referencedRelation: "business_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      business_locations: {
        Row: {
          address: string | null
          branch_name: string
          business_card_id: string
          business_hours: string | null
          created_at: string
          id: string
          is_primary: boolean
          latitude: number | null
          longitude: number | null
          phone: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          branch_name: string
          business_card_id: string
          business_hours?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          branch_name?: string
          business_card_id?: string
          business_hours?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_locations_business_card_id_fkey"
            columns: ["business_card_id"]
            isOneToOne: false
            referencedRelation: "business_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      business_photos: {
        Row: {
          business_card_id: string
          caption: string | null
          created_at: string
          id: string
          photo_url: string
          sort_order: number | null
          user_id: string
        }
        Insert: {
          business_card_id: string
          caption?: string | null
          created_at?: string
          id?: string
          photo_url: string
          sort_order?: number | null
          user_id: string
        }
        Update: {
          business_card_id?: string
          caption?: string | null
          created_at?: string
          id?: string
          photo_url?: string
          sort_order?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_photos_business_card_id_fkey"
            columns: ["business_card_id"]
            isOneToOne: false
            referencedRelation: "business_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      business_reports: {
        Row: {
          admin_notes: string | null
          business_id: string
          created_at: string
          details: string | null
          id: string
          reason: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          business_id: string
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          business_id?: string
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_staff: {
        Row: {
          business_card_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          permissions: string[] | null
          role: string
          user_id: string
        }
        Insert: {
          business_card_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          permissions?: string[] | null
          role?: string
          user_id: string
        }
        Update: {
          business_card_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          permissions?: string[] | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_staff_business_card_id_fkey"
            columns: ["business_card_id"]
            isOneToOne: false
            referencedRelation: "business_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          admin_user_id: string
          body: string | null
          campaign_type: string | null
          created_at: string | null
          id: string
          sent_count: number | null
          status: string | null
          target_audience: string | null
          title: string
        }
        Insert: {
          admin_user_id: string
          body?: string | null
          campaign_type?: string | null
          created_at?: string | null
          id?: string
          sent_count?: number | null
          status?: string | null
          target_audience?: string | null
          title: string
        }
        Update: {
          admin_user_id?: string
          body?: string | null
          campaign_type?: string | null
          created_at?: string | null
          id?: string
          sent_count?: number | null
          status?: string | null
          target_audience?: string | null
          title?: string
        }
        Relationships: []
      }
      card_analytics: {
        Row: {
          business_card_id: string
          created_at: string
          event_type: string
          id: string
          visitor_id: string | null
        }
        Insert: {
          business_card_id: string
          created_at?: string
          event_type: string
          id?: string
          visitor_id?: string | null
        }
        Update: {
          business_card_id?: string
          created_at?: string
          event_type?: string
          id?: string
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_analytics_business_card_id_fkey"
            columns: ["business_card_id"]
            isOneToOne: false
            referencedRelation: "business_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      claimed_vouchers: {
        Row: {
          code: string
          created_at: string
          id: string
          purchased_at: string
          redeemed_at: string | null
          status: string
          user_id: string
          voucher_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          purchased_at?: string
          redeemed_at?: string | null
          status?: string
          user_id: string
          voucher_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          purchased_at?: string
          redeemed_at?: string | null
          status?: string
          user_id?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claimed_vouchers_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          business_avatar: string | null
          business_id: string
          business_name: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_avatar?: string | null
          business_id: string
          business_name: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_avatar?: string | null
          business_id?: string
          business_name?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      disputes: {
        Row: {
          admin_notes: string | null
          business_id: string
          created_at: string
          description: string
          dispute_type: string
          id: string
          reference_id: string
          resolution: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          business_id: string
          created_at?: string
          description: string
          dispute_type?: string
          id?: string
          reference_id: string
          resolution?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          business_id?: string
          created_at?: string
          description?: string
          dispute_type?: string
          id?: string
          reference_id?: string
          resolution?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      event_registrations: {
        Row: {
          created_at: string
          email: string
          event_id: string
          full_name: string
          id: string
          is_verified: boolean | null
          phone: string | null
          qr_code: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          event_id: string
          full_name: string
          id?: string
          is_verified?: boolean | null
          phone?: string | null
          qr_code: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          event_id?: string
          full_name?: string
          id?: string
          is_verified?: boolean | null
          phone?: string | null
          qr_code?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          approval_status: string
          business_card_id: string | null
          category: string
          created_at: string
          date: string
          description: string | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          is_free: boolean | null
          max_attendees: number | null
          organizer_name: string | null
          price: number | null
          time: string
          title: string
          updated_at: string
          user_id: string | null
          venue: string
        }
        Insert: {
          approval_status?: string
          business_card_id?: string | null
          category: string
          created_at?: string
          date: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_free?: boolean | null
          max_attendees?: number | null
          organizer_name?: string | null
          price?: number | null
          time: string
          title: string
          updated_at?: string
          user_id?: string | null
          venue: string
        }
        Update: {
          approval_status?: string
          business_card_id?: string | null
          category?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_free?: boolean | null
          max_attendees?: number | null
          organizer_name?: string | null
          price?: number | null
          time?: string
          title?: string
          updated_at?: string
          user_id?: string | null
          venue?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_business_card_id_fkey"
            columns: ["business_card_id"]
            isOneToOne: false
            referencedRelation: "business_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          business_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          created_at: string
          id: string
          lifetime_points: number
          points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lifetime_points?: number
          points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lifetime_points?: number
          points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          card_data: Json | null
          conversation_id: string
          created_at: string
          id: string
          message_type: string
          read_at: string | null
          sender_type: string
          text: string
        }
        Insert: {
          card_data?: Json | null
          conversation_id: string
          created_at?: string
          id?: string
          message_type?: string
          read_at?: string | null
          sender_type?: string
          text: string
        }
        Update: {
          card_data?: Json | null
          conversation_id?: string
          created_at?: string
          id?: string
          message_type?: string
          read_at?: string | null
          sender_type?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          description: string | null
          emoji: string | null
          id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_categories: {
        Row: {
          created_at: string
          emoji: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      points_transactions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          points: number
          source: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          points: number
          source: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          source?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          is_suspended: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_suspended?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_suspended?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_campaigns: {
        Row: {
          body: string
          business_card_id: string
          created_at: string
          id: string
          sent_count: number
          target_type: string
          title: string
          user_id: string
        }
        Insert: {
          body: string
          business_card_id: string
          created_at?: string
          id?: string
          sent_count?: number
          target_type?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          business_card_id?: string
          created_at?: string
          id?: string
          sent_count?: number
          target_type?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_campaigns_business_card_id_fkey"
            columns: ["business_card_id"]
            isOneToOne: false
            referencedRelation: "business_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referral_code: string
          referred_id: string
          referrer_id: string
          reward_amount: number
          reward_redeemed: boolean
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code: string
          referred_id: string
          referrer_id: string
          reward_amount?: number
          reward_redeemed?: boolean
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          reward_amount?: number
          reward_redeemed?: boolean
          status?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          business_id: string
          business_reply: string | null
          business_reply_at: string | null
          comment: string | null
          created_at: string
          id: string
          is_flagged: boolean
          photo_urls: string[] | null
          rating: number
          user_id: string
        }
        Insert: {
          business_id: string
          business_reply?: string | null
          business_reply_at?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          is_flagged?: boolean
          photo_urls?: string[] | null
          rating: number
          user_id: string
        }
        Update: {
          business_id?: string
          business_reply?: string | null
          business_reply_at?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          is_flagged?: boolean
          photo_urls?: string[] | null
          rating?: number
          user_id?: string
        }
        Relationships: []
      }
      service_pricing: {
        Row: {
          business_card_id: string
          created_at: string
          description: string | null
          duration: string | null
          id: string
          price: number
          service_name: string
          sort_order: number | null
          user_id: string
        }
        Insert: {
          business_card_id: string
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          price?: number
          service_name: string
          sort_order?: number | null
          user_id: string
        }
        Update: {
          business_card_id?: string
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          price?: number
          service_name?: string
          sort_order?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_pricing_business_card_id_fkey"
            columns: ["business_card_id"]
            isOneToOne: false
            referencedRelation: "business_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      spam_flags: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          flag_type: string
          id: string
          is_resolved: boolean | null
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          flag_type: string
          id?: string
          is_resolved?: boolean | null
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          flag_type?: string
          id?: string
          is_resolved?: boolean | null
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_cycle: string
          created_at: string
          expires_at: string | null
          id: string
          plan: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string | null
          id: string
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      synced_contacts: {
        Row: {
          contact_name: string | null
          created_at: string
          id: string
          phone_number: string
          user_id: string
        }
        Insert: {
          contact_name?: string | null
          created_at?: string
          id?: string
          phone_number: string
          user_id: string
        }
        Update: {
          contact_name?: string | null
          created_at?: string
          id?: string
          phone_number?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      voucher_transfers: {
        Row: {
          claimed_voucher_id: string
          created_at: string
          id: string
          recipient_id: string
          recipient_phone: string | null
          sender_id: string
          sender_phone: string | null
          voucher_id: string
        }
        Insert: {
          claimed_voucher_id: string
          created_at?: string
          id?: string
          recipient_id: string
          recipient_phone?: string | null
          sender_id: string
          sender_phone?: string | null
          voucher_id: string
        }
        Update: {
          claimed_voucher_id?: string
          created_at?: string
          id?: string
          recipient_id?: string
          recipient_phone?: string | null
          sender_id?: string
          sender_phone?: string | null
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_transfers_claimed_voucher_id_fkey"
            columns: ["claimed_voucher_id"]
            isOneToOne: false
            referencedRelation: "claimed_vouchers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_transfers_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          business_card_id: string | null
          category: string
          created_at: string
          discount_label: string | null
          discounted_price: number
          expires_at: string | null
          id: string
          is_popular: boolean | null
          max_claims: number | null
          original_price: number
          status: string
          subtitle: string | null
          terms: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_card_id?: string | null
          category?: string
          created_at?: string
          discount_label?: string | null
          discounted_price?: number
          expires_at?: string | null
          id?: string
          is_popular?: boolean | null
          max_claims?: number | null
          original_price?: number
          status?: string
          subtitle?: string | null
          terms?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_card_id?: string | null
          category?: string
          created_at?: string
          discount_label?: string | null
          discounted_price?: number
          expires_at?: string | null
          id?: string
          is_popular?: boolean | null
          max_claims?: number | null
          original_price?: number
          status?: string
          subtitle?: string | null
          terms?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_business_card_id_fkey"
            columns: ["business_card_id"]
            isOneToOne: false
            referencedRelation: "business_cards"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_pause_expired_ads: { Args: never; Returns: number }
      award_loyalty_points: {
        Args: {
          p_description?: string
          p_points: number
          p_source: string
          p_user_id: string
        }
        Returns: undefined
      }
      get_network_cards: {
        Args: { p_user_id: string }
        Returns: {
          anniversary: string | null
          approval_status: string
          birthdate: string | null
          business_hours: string | null
          category: string | null
          company_address: string | null
          company_email: string | null
          company_maps_link: string | null
          company_name: string | null
          company_phone: string | null
          created_at: string
          description: string | null
          email: string | null
          established_year: string | null
          facebook: string | null
          full_name: string
          gender: string | null
          home_service: boolean
          id: string
          instagram: string | null
          is_verified: boolean
          job_title: string | null
          keywords: string | null
          latitude: number | null
          linkedin: string | null
          location: string | null
          logo_url: string | null
          longitude: number | null
          maps_link: string | null
          offer: string | null
          phone: string
          service_mode: string
          services: string[] | null
          telegram: string | null
          twitter: string | null
          updated_at: string
          user_id: string
          website: string | null
          whatsapp: string | null
          youtube: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "business_cards"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      record_ad_click: {
        Args: { p_campaign_id: string; p_variant_id?: string }
        Returns: undefined
      }
      record_ad_impression: {
        Args: { p_campaign_id: string; p_variant_id?: string }
        Returns: undefined
      }
      redeem_loyalty_points: {
        Args: { p_description?: string; p_points: number; p_user_id: string }
        Returns: boolean
      }
      transfer_voucher: {
        Args: { p_claimed_voucher_id: string; p_recipient_phone: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "customer" | "business" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["customer", "business", "admin"],
    },
  },
} as const
