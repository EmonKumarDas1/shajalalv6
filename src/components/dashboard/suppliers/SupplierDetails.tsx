import { useState, useEffect } from "react";
import { supabase } from "../../../../supabase/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Truck,
  Package,
  User,
  ExternalLink,
  Eye,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Supplier } from "@/types/schema";
import { SupplierPaymentForm } from "./SupplierPaymentForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type SupplierDetailsProps = {
  supplier: Supplier;
  onBack: () => void;
  onSupplierUpdated: () => void;
};

type Product = {
  id: string;
  name: string;
  buying_price: number;
  selling_price: number;
  quantity: number;
  remaining_amount: number;
  created_at: string;
  shop_name?: string;
  invoice_id?: string;
};

type Payment = {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes?: string;
  created_at: string;
};

type Invoice = {
  id: string;
  invoice_number: string;
  created_at: string;
  total_amount: number;
  advance_payment: number;
  remaining_amount: number;
  status: "paid" | "partially_paid" | "unpaid";
  shop_id?: string;
  shop_name?: string;
  invoice_type?: string;
};

export function SupplierDetails({
  supplier,
  onBack,
  onSupplierUpdated,
}: SupplierDetailsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [pendingDues, setPendingDues] = useState(0);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSupplierData();
  }, [supplier]);

  async function fetchSupplierData() {
    try {
      setLoading(true);

      // Fetch products from this supplier with shop details
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*, shops(id, name), invoice_id")
        .eq("supplier_id", supplier.id)
        .order("created_at", { ascending: false });

      if (productsError) throw productsError;

      // Process products to include shop name
      const processedProducts =
        productsData?.map((item) => ({
          ...item,
          shop_name: item.shops?.name || "Unknown Shop",
        })) || [];

      setProducts(processedProducts);

      // Calculate total purchases and pending dues
      const totalAmount = processedProducts.reduce(
        (sum, product) =>
          sum + Number(product.buying_price) * Number(product.quantity),
        0,
      );
      setTotalPurchases(totalAmount);

      const pendingAmount = processedProducts.reduce(
        (sum, product) => sum + Number(product.remaining_amount || 0),
        0,
      );
      setPendingDues(pendingAmount);

      // Fetch invoices related to this supplier
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select("*, shops(id, name)")
        .eq("supplier_id", supplier.id)
        .in("status", ["partially_paid", "unpaid"])
        .order("created_at", { ascending: false });

      if (invoicesError) {
        console.error("Error fetching supplier invoices:", invoicesError);
      } else {
        // Process invoices to include shop name
        const processedInvoices =
          invoicesData?.map((invoice) => ({
            ...invoice,
            shop_name: invoice.shops?.name || "Unknown Shop",
          })) || [];

        // Add to state if we add an invoices state variable
        // This data will be used in the UI below
      }

      // Try to fetch payment history
      try {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from("supplier_payments")
          .select("*")
          .eq("supplier_id", supplier.id)
          .order("payment_date", { ascending: false });

        if (paymentsError) {
          if (paymentsError.code === "PGRST116") {
            console.log("Supplier payments table doesn't exist yet");
            // We'll handle this in the SupplierPaymentForm when needed
          } else {
            throw paymentsError;
          }
        } else {
          setPayments(paymentsData || []);
        }
      } catch (error) {
        console.error("Error fetching payment history:", error);
        // Continue without payment history if there's an error
      }

      // Fetch invoices with pending dues
      try {
        const { data: invoicesData, error: invoicesError } = await supabase
          .from("invoices")
          .select("*, shops(id, name)")
          .eq("supplier_id", supplier.id)
          .order("created_at", { ascending: false });

        if (invoicesError) {
          console.error("Error fetching supplier invoices:", invoicesError);
        } else {
          // Process invoices to include shop name
          const processedInvoices =
            invoicesData?.map((invoice) => ({
              ...invoice,
              shop_name: invoice.shops?.name || "Unknown Shop",
            })) || [];

          setInvoices(processedInvoices);
        }
      } catch (error) {
        console.error("Error fetching invoices:", error);
        // Continue without invoices if there's an error
      }
    } catch (error) {
      console.error("Error fetching supplier data:", error);
      toast({
        variant: "destructive",
        title: "Error fetching supplier data",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  const handlePayment = () => {
    setIsPaymentDialogOpen(true);
  };

  const handleViewInvoice = (invoiceId: string) => {
    if (invoiceId) {
      navigate(`/dashboard/invoices/${invoiceId}`);
    } else {
      toast({
        variant: "destructive",
        title: "No invoice found",
        description: "This product doesn't have an associated invoice.",
      });
    }
  };

  // Calculate total pending amount from invoices
  const totalPendingInvoiceAmount = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.remaining_amount || 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold">{supplier.name}</h2>
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
              {supplier.contact && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>{supplier.contact}</span>
                </div>
              )}
              {supplier.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>{supplier.phone}</span>
                </div>
              )}
              {supplier.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>{supplier.email}</span>
                </div>
              )}
              {supplier.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span>{supplier.address}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>
                  Supplier since{" "}
                  {format(new Date(supplier.created_at), "MMM dd, yyyy")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Purchases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${totalPurchases.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {products.length} products
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Pending Dues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${pendingDues.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {products.filter((p) => p.remaining_amount > 0).length} products
              with pending payment
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} with
              pending payment
            </div>
            {pendingDues > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                onClick={handlePayment}
              >
                <DollarSign className="h-3.5 w-3.5 mr-1" />
                Make Payment
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {supplier.notes || "No notes available for this supplier."}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="products" className="flex items-center gap-1">
            <Package className="h-4 w-4" />
            Purchase History
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            Payment History
          </TabsTrigger>
          <TabsTrigger value="dues" className="flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            Pending Dues
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            All Invoices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-600" />
                Purchase History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No purchase history found for this supplier.
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Shop</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">
                            {product.name}
                          </TableCell>
                          <TableCell>{product.shop_name}</TableCell>
                          <TableCell>
                            {format(
                              new Date(product.created_at),
                              "MMM dd, yyyy",
                            )}
                          </TableCell>
                          <TableCell>{product.quantity}</TableCell>
                          <TableCell>
                            ${product.buying_price.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            $
                            {(product.buying_price * product.quantity).toFixed(
                              2,
                            )}
                          </TableCell>
                          <TableCell>
                            {Number(product.remaining_amount) > 0 ? (
                              <Badge
                                variant="outline"
                                className="bg-yellow-50 text-yellow-700 border-yellow-200"
                              >
                                Partially Paid
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 border-green-200"
                              >
                                Paid
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No payment history found for this supplier.
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {format(
                              new Date(payment.payment_date),
                              "MMM dd, yyyy",
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-green-600">
                            ${payment.amount.toFixed(2)}
                          </TableCell>
                          <TableCell className="capitalize">
                            {payment.payment_method}
                          </TableCell>
                          <TableCell>{payment.notes || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dues" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Pending Dues
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : products.filter((p) => p.remaining_amount > 0).length ===
                0 ? (
                <div className="text-center py-8 text-gray-500">
                  No pending dues for this supplier.
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Shop</TableHead>
                        <TableHead>Purchase Date</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Remaining</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products
                        .filter((p) => p.remaining_amount > 0)
                        .map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">
                              {product.name}
                            </TableCell>
                            <TableCell>{product.shop_name}</TableCell>
                            <TableCell>
                              {format(
                                new Date(product.created_at),
                                "MMM dd, yyyy",
                              )}
                            </TableCell>
                            <TableCell>
                              $
                              {(
                                product.buying_price * product.quantity
                              ).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-red-600">
                                  ${product.remaining_amount.toFixed(2)}
                                </span>
                                {product.invoice_id && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-blue-600"
                                    onClick={() =>
                                      handleViewInvoice(product.invoice_id)
                                    }
                                    title="View Invoice"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-600" />
                All Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No pending invoices found for this supplier.
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Shop</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Paid Amount</TableHead>
                        <TableHead>Remaining</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">
                            {invoice.invoice_number}
                          </TableCell>
                          <TableCell>
                            {format(
                              new Date(invoice.created_at),
                              "MMM dd, yyyy",
                            )}
                          </TableCell>
                          <TableCell>{invoice.shop_name}</TableCell>
                          <TableCell>
                            ${invoice.total_amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            ${invoice.advance_payment.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-red-600">
                              ${invoice.remaining_amount.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                invoice.status === "unpaid"
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-yellow-50 text-yellow-700 border-yellow-200"
                              }
                            >
                              {invoice.status === "unpaid"
                                ? "Unpaid"
                                : "Partially Paid"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-blue-600"
                              onClick={() => handleViewInvoice(invoice.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {invoices.length > 0 && (
                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-md">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-orange-800">
                        Total Pending Amount
                      </h3>
                      <p className="text-sm text-orange-700 mt-1">
                        {invoices.length} invoice
                        {invoices.length !== 1 ? "s" : ""} with pending payment
                      </p>
                    </div>
                    <div className="text-2xl font-bold text-orange-700">
                      $
                      {invoices
                        .reduce(
                          (sum, invoice) => sum + invoice.remaining_amount,
                          0,
                        )
                        .toFixed(2)}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200"
                    onClick={handlePayment}
                  >
                    <DollarSign className="h-3.5 w-3.5 mr-1" />
                    Make Payment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Make Payment to {supplier.name}</DialogTitle>
            <DialogDescription>
              Record a payment to this supplier to reduce pending dues.
            </DialogDescription>
          </DialogHeader>
          <SupplierPaymentForm
            supplier={supplier}
            pendingAmount={pendingDues}
            onSuccess={() => {
              setIsPaymentDialogOpen(false);
              fetchSupplierData();
              onSupplierUpdated();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
