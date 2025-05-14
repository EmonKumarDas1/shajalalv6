import { useState, useEffect } from "react";
import { supabase } from "../../../../supabase/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { ReturnProductForm } from "./ReturnProductForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Search, ArrowRight, RefreshCw } from "lucide-react";

type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
};

type Invoice = {
  id: string;
  invoice_number: string;
  created_at: string;
  total_amount: number;
  status: string;
};

interface CustomerReturnFlowProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CustomerReturnFlow({
  onSuccess,
  onCancel,
}: CustomerReturnFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Step 1: Search and select customer
  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchCustomers();
    }
  }, [searchQuery]);

  // Step 2: Fetch customer invoices when customer is selected
  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerInvoices();
    }
  }, [selectedCustomerId]);

  async function searchCustomers() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, phone, email")
        .or(
          `name.ilike.%${searchQuery}%, phone.ilike.%${searchQuery}%, email.ilike.%${searchQuery}%`,
        )
        .limit(10);

      if (error) {
        console.error("Error searching customers:", error);
        throw new Error(
          `Error searching customers: ${error.message || JSON.stringify(error)}`,
        );
      }
      setCustomers(data || []);
    } catch (error) {
      console.error("Error searching customers:", error);
      toast({
        variant: "destructive",
        title: "Error searching customers",
        description:
          error instanceof Error ? error.message : JSON.stringify(error),
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchCustomerInvoices() {
    try {
      setLoading(true);

      // First get the customer details
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", selectedCustomerId)
        .single();

      if (customerError) {
        console.error("Error fetching customer details:", customerError);
        throw new Error(
          `Error fetching customer details: ${customerError.message || JSON.stringify(customerError)}`,
        );
      }
      setSelectedCustomer(customerData);

      // Then get their invoices
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, created_at, total_amount, status")
        .eq("customer_id", selectedCustomerId)
        .eq("invoice_type", "sales") // Only get sales invoices, not product additions
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching invoices:", error);
        throw new Error(
          `Error fetching invoices: ${error.message || JSON.stringify(error)}`,
        );
      }

      // Filter out invoices with no items
      const invoicesWithItems = [];
      for (const invoice of data || []) {
        try {
          const { data: items, error: itemsError } = await supabase
            .from("invoice_items")
            .select("id")
            .eq("invoice_id", invoice.id)
            .limit(1);

          if (itemsError) {
            console.warn(
              `Error checking items for invoice ${invoice.id}:`,
              itemsError,
            );
            continue;
          }

          if (items && items.length > 0) {
            invoicesWithItems.push(invoice);
          }
        } catch (itemError) {
          console.warn(`Error processing invoice ${invoice.id}:`, itemError);
          // Continue with other invoices even if one fails
          continue;
        }
      }

      setInvoices(invoicesWithItems);
    } catch (error) {
      console.error("Error fetching customer invoices:", error);
      toast({
        variant: "destructive",
        title: "Error fetching invoices",
        description:
          error instanceof Error ? error.message : JSON.stringify(error),
      });
    } finally {
      setLoading(false);
    }
  }

  function handleSelectInvoice(invoiceId: string) {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    setSelectedInvoiceId(invoiceId);
    setSelectedInvoice(invoice || null);
    setStep(3);
  }

  function handleReturnSuccess() {
    toast({
      title: "Return processed",
      description: "The return has been successfully processed",
    });
    if (onSuccess) onSuccess();
  }

  function handleCancel() {
    if (onCancel) onCancel();
  }

  function handleBack() {
    if (step === 2) {
      setStep(1);
      setSelectedCustomerId("");
      setSelectedCustomer(null);
    } else if (step === 3) {
      setStep(2);
      setSelectedInvoiceId("");
      setSelectedInvoice(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"}`}
          >
            1
          </div>
          <div
            className={`h-1 w-12 ${step >= 2 ? "bg-blue-600" : "bg-gray-200"}`}
          ></div>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"}`}
          >
            2
          </div>
          <div
            className={`h-1 w-12 ${step >= 3 ? "bg-blue-600" : "bg-gray-200"}`}
          ></div>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"}`}
          >
            3
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {step === 1 && "Select Customer"}
          {step === 2 && "Select Invoice"}
          {step === 3 && "Process Return"}
        </div>
      </div>

      {/* Step 1: Customer Selection */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Search customers by name, phone, or email"
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="flex justify-center py-4">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : customers.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                {searchQuery.length >= 2
                  ? "No customers found"
                  : "Type at least 2 characters to search"}
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    className={`p-3 border rounded-md cursor-pointer hover:bg-gray-50 ${selectedCustomerId === customer.id ? "border-blue-500 bg-blue-50" : ""}`}
                    onClick={() => {
                      setSelectedCustomerId(customer.id);
                      setStep(2);
                    }}
                  >
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-sm text-gray-500">
                      {customer.phone} {customer.email && `• ${customer.email}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Invoice Selection */}
      {step === 2 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Select Invoice</CardTitle>
            <Button variant="outline" size="sm" onClick={handleBack}>
              Back
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedCustomer && (
              <div className="bg-blue-50 p-3 rounded-md">
                <div className="font-medium">{selectedCustomer.name}</div>
                <div className="text-sm text-gray-600">
                  {selectedCustomer.phone}{" "}
                  {selectedCustomer.email && `• ${selectedCustomer.email}`}
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-4">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No invoices found for this customer
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="p-3 border rounded-md cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSelectInvoice(invoice.id)}
                  >
                    <div className="flex justify-between">
                      <div className="font-medium">
                        Invoice #{invoice.invoice_number}
                      </div>
                      <div className="text-sm font-medium">
                        ${invoice.total_amount.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <div>
                        {format(new Date(invoice.created_at), "MMM dd, yyyy")}
                      </div>
                      <div className="capitalize">
                        {invoice.status.replace("_", " ")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Return Process */}
      {step === 3 && selectedInvoiceId && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Button variant="outline" size="sm" onClick={handleBack}>
              Back
            </Button>
            {selectedInvoice && (
              <div className="text-sm text-gray-600">
                Processing return for Invoice #{selectedInvoice.invoice_number}
              </div>
            )}
          </div>
          <ReturnProductForm
            invoiceId={selectedInvoiceId}
            onSuccess={handleReturnSuccess}
            onCancel={handleCancel}
          />
        </div>
      )}
    </div>
  );
}
