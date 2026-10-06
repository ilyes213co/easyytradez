// Generated from canonical project schema (supabase/schema.sql)
// Last sync: 2026-03-27

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type StoreStatus =
  | "draft"
  | "generating"
  | "generated"
  | "published"
  | "inactive"
  | "suspended"
  | "active";

export type ProductStatus = "active" | "draft" | "archived";
export type PlanType = "free" | "pro" | "business";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";
export type PaymentStatus = "pending" | "paid" | "refunded";

export interface ProductImage {
  url: string;
  public_id?: string;
  width?: number;
  height?: number;
  alt?: string | null;
}

export interface OrderItem {
  name?: string;
  qty?: number;
  quantity?: number;
  price?: number;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          plan: PlanType;
          avatar_url: string | null;
          plan_expires_at?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          plan?: PlanType;
          avatar_url?: string | null;
          plan_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          plan?: PlanType;
          avatar_url?: string | null;
          plan_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      stores: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          description: string | null;
          logo_url: string | null;
          cover_url: string | null;
          whatsapp_phone: string | null;
          primary_color: string;
          font_family: string | null;
          theme: string;
          brand_accent: string | null;
          animation_style: string;
          special_effects: string[];
          category: string | null;
          currency: string;
          city: string | null;
          country: string;
          status: StoreStatus;
          type: "boutique" | "funnel";
          subdomain: string | null;
          vercel_project_id: string | null;
          published_url: string | null;
          github_repo: string | null;
          generated_html: string | null;
          seo_title: string | null;
          seo_description: string | null;
          slogan: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug: string;
          description?: string | null;
          logo_url?: string | null;
          cover_url?: string | null;
          whatsapp_phone?: string | null;
          primary_color?: string;
          font_family?: string | null;
          theme?: string;
          brand_accent?: string | null;
          animation_style?: string;
          special_effects?: string[];
          category?: string | null;
          currency?: string;
          city?: string | null;
          country?: string;
          status?: StoreStatus;
          type?: "boutique" | "funnel";
          subdomain?: string | null;
          vercel_project_id?: string | null;
          published_url?: string | null;
          github_repo?: string | null;
          generated_html?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          slogan?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          logo_url?: string | null;
          cover_url?: string | null;
          whatsapp_phone?: string | null;
          primary_color?: string;
          font_family?: string | null;
          theme?: string;
          brand_accent?: string | null;
          animation_style?: string;
          special_effects?: string[];
          category?: string | null;
          currency?: string;
          city?: string | null;
          country?: string;
          status?: StoreStatus;
          type?: "boutique" | "funnel";
          subdomain?: string | null;
          vercel_project_id?: string | null;
          published_url?: string | null;
          github_repo?: string | null;
          generated_html?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          slogan?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stores_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          slug: string | null;
          description: string | null;
          price: number;
          original_price: number | null;
          category: string | null;
          stock_quantity: number;
          images: ProductImage[];
          is_featured: boolean;
          position: number;
          status: ProductStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          name: string;
          slug?: string | null;
          description?: string | null;
          price: number;
          original_price?: number | null;
          category?: string | null;
          stock_quantity?: number;
          images?: ProductImage[];
          is_featured?: boolean;
          position?: number;
          status?: ProductStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          name?: string;
          slug?: string | null;
          description?: string | null;
          price?: number;
          original_price?: number | null;
          category?: string | null;
          stock_quantity?: number;
          images?: ProductImage[];
          is_featured?: boolean;
          position?: number;
          status?: ProductStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          id: string;
          store_id: string;
          customer_name: string;
          customer_phone: string;
          customer_email: string | null;
          customer_address: string | null;
          items: OrderItem[];
          total_amount: number;
          status: OrderStatus;
          payment_status: PaymentStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          customer_name: string;
          customer_phone: string;
          customer_email?: string | null;
          customer_address?: string | null;
          items?: OrderItem[];
          total_amount?: number;
          status?: OrderStatus;
          payment_status?: PaymentStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          customer_name?: string;
          customer_phone?: string;
          customer_email?: string | null;
          customer_address?: string | null;
          items?: OrderItem[];
          total_amount?: number;
          status?: OrderStatus;
          payment_status?: PaymentStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      store_analytics: {
        Row: {
          id: string;
          store_id: string;
          event_type: string;
          product_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          event_type: string;
          product_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          event_type?: string;
          product_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "store_analytics_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "store_analytics_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      generation_jobs: {
        Row: {
          id: string;
          store_id: string;
          user_id: string;
          status: string;
          progress: number;
          html: string | null;
          metadata: Json | null;
          error: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id: string;
          store_id: string;
          user_id: string;
          status: string;
          progress?: number;
          html?: string | null;
          metadata?: Json | null;
          error?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          store_id?: string;
          user_id?: string;
          status?: string;
          progress?: number;
          html?: string | null;
          metadata?: Json | null;
          error?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "generation_jobs_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "generation_jobs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      delivery_zones: {
        Row: {
          id: string;
          store_id: string;
          wilaya_code: string;
          fee: number;
          enabled: boolean;
          free_above: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          wilaya_code: string;
          fee?: number;
          enabled?: boolean;
          free_above?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          wilaya_code?: string;
          fee?: number;
          enabled?: boolean;
          free_above?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "delivery_zones_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          id: string;
          store_id: string;
          user_id: string;
          endpoint: string;
          p256dh: string | null;
          auth: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          user_id: string;
          endpoint: string;
          p256dh?: string | null;
          auth?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string | null;
          auth?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      plan_transactions: {
        Row: {
          id: string;
          user_id: string;
          plan: PlanType;
          amount: number;
          currency: string;
          billing_period: "monthly" | "yearly";
          invoice_id: string | null;
          payment_url: string | null;
          slickpay_raw: Json | null;
          status: "pending" | "paid" | "failed" | "expired" | "cancelled";
          paid_at: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan: PlanType;
          amount: number;
          currency?: string;
          billing_period?: "monthly" | "yearly";
          invoice_id?: string | null;
          payment_url?: string | null;
          slickpay_raw?: Json | null;
          status?: "pending" | "paid" | "failed" | "expired" | "cancelled";
          paid_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan?: PlanType;
          amount?: number;
          currency?: string;
          billing_period?: "monthly" | "yearly";
          invoice_id?: string | null;
          payment_url?: string | null;
          slickpay_raw?: Json | null;
          status?: "pending" | "paid" | "failed" | "expired" | "cancelled";
          paid_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plan_transactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
