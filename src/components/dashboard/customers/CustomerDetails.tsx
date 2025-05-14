import { useState, useEffect } from "react";
import { supabase } from "../../../../supabase/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Save,
  User,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  created_at: string;
  total_spent?: number;
  last_purchase?: string;
  balance?: number;
  total_due?: number;
};

type Invoice = {
  id: string;
  invoice_number: string;
  total_amount: number;
  advance_payment: number;
  remaining_amount: number;
  status: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
};

type Payment = {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes?: string;
  created_at: string;
};

type CustomerDetailsProps = {
  customer: Customer;
  onBack: () => void;
  onCustomerUpdated: () => void;
};

export function CustomerDetails({
  customer,
  onBack,
  onCustomerUpdated,
}: CustomerDetailsProps) {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);
  const [outstandingAmount, setOutstandingAmount] = useState(0);
  const [completedOrders, setCompletedOrders] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [isEditing, setIsEditing] = useState(customer.id === "");
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: customer.name || "",
    phone: customer.phone || "",
    email: customer.email || "",
    address: customer.address || "",
  });

  useEffect(() => {
    if (customer.id) {
      fetchCustomerData();
    }
  }, [customer]);

  async function fetchCustomerData() {
    try {
      setLoading(true);

      // Fetch all invoices for this customer using both customer_id and customer_phone
      let query = supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });

      // If customer has an ID, use that for more reliable matching
      if (customer.id) {
        query = query.eq("customer_id", customer.id);
      } else {
        // Fallback to phone number matching
        query = query.eq("customer_phone", customer.phone);
      }

      const { data: invoicesData, error: invoicesError } = await query;

      if (invoicesError) throw invoicesError;
      setInvoices(invoicesData || []);

      // Calculate statistics
      let totalPaid = 0;
      let totalOutstanding = 0;
      let completed = 0;
      let pending = 0;

      invoicesData?.forEach((invoice) => {
        if (invoice.status === "paid") {
          totalPaid += Number(invoice.total_amount);
          completed++;
        } else if (invoice.status === "partially_paid") {
          totalPaid += Number(invoice.advance_payment);
          totalOutstanding += Number(invoice.remaining_amount);
          pending++;
        } else {
          totalOutstanding += Number(invoice.total_amount);
          pending++;
        }
      });

      setTotalSpent(totalPaid);
      setOutstandingAmount(totalOutstanding);
      setCompletedOrders(completed);
      setPendingOrders(pending);

      // Fetch all payments for this customer's invoices
      if (invoicesData && invoicesData.length > 0) {
        const invoiceIds = invoicesData.map((invoice) => invoice.id);
        const { data: paymentsData, error: paymentsError } = await supabase
          .from("payments")
          .select("*")
          .in("invoice_id", invoiceIds)
          .order("payment_date", { ascending: false });

        if (paymentsError) throw paymentsError;
        setPayments(paymentsData || []);
      }
    } catch (error) {
      console.error("Error fetching customer data:", error);
      toast({
        variant: "destructive",
        title: "Error fetching customer data",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Name and phone number are required.",
      });
      return;
    }

    try {
      setIsSaving(true);

      if (customer.id) {
        // Update existing customer
        const { error } = await supabase
          .from("customers")
          .update({
            name: formData.name,
            phone: formData.phone,
            email: formData.email || null,
            address: formData.address || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", customer.id);

        if (error) throw error;

        toast({
          title: "Customer updated",
          description: "Customer information has been updated successfully.",
        });
      } else {
        // Create new customer
        const { data, error } = await supabase
          .from("customers")
          .insert({
            name: formData.name,
            phone: formData.phone,
            email: formData.email || null,
            address: formData.address || null,
            created_at: new Date().toISOString(),
          })
          .select();

        if (error) throw error;

        toast({
          title: "Customer created",
          description: "New customer has been created successfully.",
        });
      }

      setIsEditing(false);
      onCustomerUpdated();
    } catch (error) {
      console.error("Error saving customer:", error);
      toast({
        variant: "destructive",
        title: "Error saving customer",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Paid
          </Badge>
        );
      case "partially_paid":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Partially Paid
          </Badge>
        );
      case "unpaid":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            Unpaid
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
            {status}
          </Badge>
        );
    }
  };

  const handleInvoiceClick = (invoiceId: string) => {
    navigate(`/dashboard/invoices/${invoiceId}`);
  };

  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-bold">
            {customer.id ? `Edit ${customer.name}` : "Add New Customer"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1234567890"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="john.doe@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="123 Main St, City, Country"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onBack}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Customer
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-bold">{customer.name}</h2>
        </div>
        <Button onClick={() => setIsEditing(true)}>
          <User className="mr-2 h-4 w-4" /> Edit Customer
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <span>{customer.phone}</span>
              </div>
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>{customer.email}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span>{customer.address}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>
                  Customer since{" "}
                  {format(new Date(customer.created_at), "MMM dd, yyyy")}
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500 font-medium">Customer ID</p>
                <p className="text-sm font-mono">{customer.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalSpent.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Across {invoices.length} orders
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Outstanding Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${outstandingAmount.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {pendingOrders} pending payments
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Order Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between">
              <div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Completed</span>
                </div>
                <div className="text-lg font-bold">{completedOrders}</div>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium">Pending</span>
                </div>
                <div className="text-lg font-bold">{pendingOrders}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="orders">Order History</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="credit">Credit & Dues</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Purchase History</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No purchase history found for this customer.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Paid Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow
                        key={invoice.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleInvoiceClick(invoice.id)}
                      >
                        <TableCell className="font-medium">
                          {invoice.invoice_number}
                        </TableCell>
                        <TableCell>
                          {format(new Date(invoice.created_at), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          ${Number(invoice.total_amount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          $
                          {invoice.status === "paid"
                            ? Number(invoice.total_amount).toFixed(2)
                            : Number(invoice.advance_payment).toFixed(2)}
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No payment history found for this customer.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => {
                      const relatedInvoice = invoices.find(
                        (inv) => inv.id === payment.invoice_id,
                      );
                      return (
                        <TableRow
                          key={payment.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() =>
                            relatedInvoice &&
                            handleInvoiceClick(relatedInvoice.id)
                          }
                        >
                          <TableCell>
                            {format(
                              new Date(payment.payment_date),
                              "MMM dd, yyyy",
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            ${Number(payment.amount).toFixed(2)}
                          </TableCell>
                          <TableCell className="capitalize">
                            {payment.payment_method}
                          </TableCell>
                          <TableCell>
                            {relatedInvoice?.invoice_number ||
                              payment.invoice_id}
                          </TableCell>
                          <TableCell>{payment.notes || "-"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credit" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Outstanding Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : invoices.filter((inv) => inv.status !== "paid").length ===
                0 ? (
                <div className="text-center py-8 text-gray-500">
                  No outstanding payments for this customer.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Paid Amount</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices
                      .filter((invoice) => invoice.status !== "paid")
                      .map((invoice) => (
                        <TableRow
                          key={invoice.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleInvoiceClick(invoice.id)}
                        >
                          <TableCell className="font-medium">
                            {invoice.invoice_number}
                          </TableCell>
                          <TableCell>
                            {format(
                              new Date(invoice.created_at),
                              "MMM dd, yyyy",
                            )}
                          </TableCell>
                          <TableCell>
                            ${Number(invoice.total_amount).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            ${Number(invoice.advance_payment).toFixed(2)}
                          </TableCell>
                          <TableCell className="font-medium text-red-600">
                            ${Number(invoice.remaining_amount).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(invoice.status)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
