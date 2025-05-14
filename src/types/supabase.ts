export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string | null
          date: string
          employee_id: string | null
          id: string
          notes: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date: string
          employee_id?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date?: string
          employee_id?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          hire_date: string | null
          id: string
          last_automated_salary_date: string | null
          last_salary_payment: string | null
          name: string
          payment_frequency: string | null
          phone: string | null
          position: string | null
          profile_image: string | null
          salary: number | null
          salary_structure: Json | null
          status: string | null
          tax_deductions: Json | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          hire_date?: string | null
          id?: string
          last_automated_salary_date?: string | null
          last_salary_payment?: string | null
          name: string
          payment_frequency?: string | null
          phone?: string | null
          position?: string | null
          profile_image?: string | null
          salary?: number | null
          salary_structure?: Json | null
          status?: string | null
          tax_deductions?: Json | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          hire_date?: string | null
          id?: string
          last_automated_salary_date?: string | null
          last_salary_payment?: string | null
          name?: string
          payment_frequency?: string | null
          phone?: string | null
          position?: string | null
          profile_image?: string | null
          salary?: number | null
          salary_structure?: Json | null
          status?: string | null
          tax_deductions?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          barcode: string | null
          created_at: string | null
          id: string
          invoice_id: string | null
          product_id: string | null
          product_name: string | null
          quantity: number
          supplier_name: string | null
          total_price: number
          unit_price: number
          watt: number | null
        }
        Insert: {
          barcode?: string | null
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          product_id?: string | null
          product_name?: string | null
          quantity: number
          supplier_name?: string | null
          total_price: number
          unit_price: number
          watt?: number | null
        }
        Update: {
          barcode?: string | null
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          supplier_name?: string | null
          total_price?: number
          unit_price?: number
          watt?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          advance_payment: number
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          invoice_number: string
          invoice_type: string | null
          notes: string | null
          remaining_amount: number
          shop_id: string | null
          status: string
          supplier_id: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          advance_payment?: number
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          invoice_number: string
          invoice_type?: string | null
          notes?: string | null
          remaining_amount?: number
          shop_id?: string | null
          status?: string
          supplier_id?: string | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          advance_payment?: number
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          invoice_number?: string
          invoice_type?: string | null
          notes?: string | null
          remaining_amount?: number
          shop_id?: string | null
          status?: string
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_by: string | null
          created_at: string | null
          employee_id: string | null
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          start_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          employee_id?: string | null
          end_date: string
          id?: string
          leave_type: string
          reason?: string | null
          start_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          employee_id?: string | null
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          start_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      others_costs: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          date: string | null
          description: string
          id: string
          notes: string | null
          payment_method: string | null
          reference_number: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          date?: string | null
          description: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          reference_number?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          date?: string | null
          description?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          reference_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payrolls: {
        Row: {
          created_at: string | null
          employee_id: string | null
          gross_amount: number
          id: string
          net_amount: number
          payment_date: string | null
          payment_frequency: string | null
          payment_type: number | null
          salary_structure: Json | null
          status: string | null
          tax_deductions: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          employee_id?: string | null
          gross_amount: number
          id?: string
          net_amount: number
          payment_date?: string | null
          payment_frequency?: string | null
          payment_type?: number | null
          salary_structure?: Json | null
          status?: string | null
          tax_deductions?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          employee_id?: string | null
          gross_amount?: number
          id?: string
          net_amount?: number
          payment_date?: string | null
          payment_frequency?: string | null
          payment_type?: number | null
          salary_structure?: Json | null
          status?: string | null
          tax_deductions?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      product_returns: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          refund_amount: number
          return_reason: string
          status: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          refund_amount: number
          return_reason: string
          status?: string | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          refund_amount?: number
          return_reason?: string
          status?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_returns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_returns_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          advance_payment: number | null
          barcode: string | null
          buying_price: number
          color: string | null
          company_id: string | null
          created_at: string | null
          id: string
          images: string[] | null
          invoice_id: string | null
          model: string | null
          name: string
          quantity: number
          remaining_amount: number | null
          selling_price: number
          shop_id: string | null
          size: string | null
          supplier_id: string | null
          updated_at: string | null
          watt: number | null
        }
        Insert: {
          advance_payment?: number | null
          barcode?: string | null
          buying_price: number
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          images?: string[] | null
          invoice_id?: string | null
          model?: string | null
          name: string
          quantity?: number
          remaining_amount?: number | null
          selling_price: number
          shop_id?: string | null
          size?: string | null
          supplier_id?: string | null
          updated_at?: string | null
          watt?: number | null
        }
        Update: {
          advance_payment?: number | null
          barcode?: string | null
          buying_price?: number
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          images?: string[] | null
          invoice_id?: string | null
          model?: string | null
          name?: string
          quantity?: number
          remaining_amount?: number | null
          selling_price?: number
          shop_id?: string | null
          size?: string | null
          supplier_id?: string | null
          updated_at?: string | null
          watt?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      return_items: {
        Row: {
          condition: string
          created_at: string | null
          id: string
          product_id: string | null
          quantity: number
          return_id: string | null
          return_reason: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          condition: string
          created_at?: string | null
          id?: string
          product_id?: string | null
          quantity: number
          return_id?: string | null
          return_reason?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          condition?: string
          created_at?: string | null
          id?: string
          product_id?: string | null
          quantity?: number
          return_id?: string | null
          return_reason?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "product_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_payments: {
        Row: {
          amount: number
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          payment_type: string | null
          reference_number: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_type?: string | null
          reference_number?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_type?: string | null
          reference_number?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      supplier_payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          reference_number: string | null
          supplier_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          reference_number?: string | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          reference_number?: string | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          name: string
          password: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          name: string
          password: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          name?: string
          password?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
