import { Database } from "./supabase";

export type Supplier = Database["public"]["Tables"]["suppliers"]["Row"] & {
  contact?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
};

export type SupplierInsert =
  Database["public"]["Tables"]["suppliers"]["Insert"] & {
    contact?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    notes?: string | null;
  };

export type SupplierUpdate =
  Database["public"]["Tables"]["suppliers"]["Update"] & {
    contact?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    notes?: string | null;
  };

export type Shop = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ShopInsert = {
  id?: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ShopUpdate = {
  id?: string;
  name?: string;
  address?: string | null;
  phone?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Product = Database["public"]["Tables"]["products"]["Row"] & {
  shop_id?: string | null;
  advance_payment?: number;
  remaining_amount?: number;
};

export type InvoiceType = "sales" | "product_addition" | "exchange";

export type ProductInsert =
  Database["public"]["Tables"]["products"]["Insert"] & {
    shop_id?: string | null;
    advance_payment?: number;
    remaining_amount?: number;
  };

export type ProductUpdate =
  Database["public"]["Tables"]["products"]["Update"] & {
    shop_id?: string | null;
    advance_payment?: number;
    remaining_amount?: number;
  };

export type Payment = {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
};

export type PaymentInsert = {
  id?: string;
  invoice_id: string;
  amount: number;
  payment_date?: string;
  payment_method?: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string | null;
};

export type PaymentUpdate = {
  id?: string;
  invoice_id?: string;
  amount?: number;
  payment_date?: string;
  payment_method?: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string | null;
};

export type PaymentFrequency = "monthly" | "weekly" | "bi-weekly";

export type SalaryStructure = {
  basic_salary: number;
  allowances: number;
  deductions: number;
  bonuses: number;
  overtime: number;
};

export type TaxDeduction = {
  income_tax: number;
  provident_fund: number;
  insurance: number;
  other_deductions: number;
};

export type Payroll = {
  id: string;
  employee_id: string;
  payment_date: string;
  gross_amount: number;
  net_amount: number;
  payment_frequency: PaymentFrequency;
  salary_structure: SalaryStructure;
  tax_deductions: TaxDeduction;
  status: "pending" | "paid" | "cancelled";
  created_at: string;
  updated_at: string | null;
};

export type Employee = {
  id: string;
  name: string;
  position: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  hire_date: string | null;
  salary: number | null;
  payment_frequency: PaymentFrequency | null;
  salary_structure: SalaryStructure | null;
  tax_deductions: TaxDeduction | null;
  status: string;
  profile_image: string | null;
  created_at: string;
  updated_at: string | null;
};

export type EmployeeInsert = {
  id?: string;
  name: string;
  position?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  hire_date?: string | null;
  salary?: number | null;
  payment_frequency?: PaymentFrequency | null;
  salary_structure?: SalaryStructure | null;
  tax_deductions?: TaxDeduction | null;
  status?: string;
  profile_image?: string | null;
  created_at?: string;
  updated_at?: string | null;
};

export type EmployeeUpdate = {
  id?: string;
  name?: string;
  position?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  hire_date?: string | null;
  salary?: number | null;
  payment_frequency?: PaymentFrequency | null;
  salary_structure?: SalaryStructure | null;
  tax_deductions?: TaxDeduction | null;
  status?: string;
  profile_image?: string | null;
  created_at?: string;
  updated_at?: string | null;
};

export type PayrollInsert = {
  id?: string;
  employee_id: string;
  payment_date?: string;
  gross_amount: number;
  net_amount: number;
  payment_frequency: PaymentFrequency;
  salary_structure: SalaryStructure;
  tax_deductions: TaxDeduction;
  status?: "pending" | "paid" | "cancelled";
  created_at?: string;
  updated_at?: string | null;
};

export type PayrollUpdate = {
  id?: string;
  employee_id?: string;
  payment_date?: string;
  gross_amount?: number;
  net_amount?: number;
  payment_frequency?: PaymentFrequency;
  salary_structure?: SalaryStructure;
  tax_deductions?: TaxDeduction;
  status?: "pending" | "paid" | "cancelled";
  created_at?: string;
  updated_at?: string | null;
};

export type ProductHistory = {
  id: string;
  product_id: string;
  quantity: number;
  action_type: string;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
};

export type ProductHistoryInsert = {
  id?: string;
  product_id: string;
  quantity: number;
  action_type: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string | null;
};

export type SalaryPayment = {
  id: string;
  employee_id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  reference_number: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string | null;
};

export type SalaryPaymentInsert = {
  id?: string;
  employee_id: string;
  amount: number;
  payment_date?: string;
  payment_method?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string | null;
};

export type OthersCost = {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string | null;
  payment_method: string | null;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
};

export type OthersCostInsert = {
  id?: string;
  description: string;
  amount: number;
  date?: string;
  category?: string | null;
  payment_method?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string | null;
};

export type OthersCostUpdate = {
  id?: string;
  description?: string;
  amount?: number;
  date?: string;
  category?: string | null;
  payment_method?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string | null;
};

export type ProductReturn = {
  id: string;
  invoice_id: string;
  product_id: string;
  customer_id: string;
  quantity: number;
  reason: string | null;
  return_type: "refund" | "exchange";
  status: "pending" | "processed" | "rejected";
  refund_amount: number;
  exchange_product_id?: string | null;
  price_difference?: number;
  payment_method?: string;
  condition?: string;
  return_fees?: number;
  admin_notes?: string | null;
  created_at: string;
  updated_at?: string | null;
  total_amount?: number;
};

export type ProductReturnInsert = {
  id?: string;
  invoice_id: string;
  product_id: string;
  customer_id: string;
  quantity: number;
  reason?: string | null;
  return_type: "refund" | "exchange";
  status?: "pending" | "processed" | "rejected";
  refund_amount: number;
  exchange_product_id?: string | null;
  price_difference?: number;
  payment_method?: string;
  condition?: string;
  return_fees?: number;
  admin_notes?: string | null;
  created_at?: string;
  updated_at?: string | null;
  total_amount?: number;
};

export type ProductReturnUpdate = {
  id?: string;
  invoice_id?: string;
  product_id?: string;
  customer_id?: string;
  quantity?: number;
  reason?: string | null;
  return_type?: "refund" | "exchange";
  status?: "pending" | "processed" | "rejected";
  refund_amount?: number;
  exchange_product_id?: string | null;
  price_difference?: number;
  payment_method?: string;
  condition?: string;
  return_fees?: number;
  admin_notes?: string | null;
  created_at?: string;
  updated_at?: string | null;
  total_amount?: number;
};
