import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../../supabase/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import {
  ArrowLeft,
  Download,
  Printer,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  ShoppingCart,
} from "lucide-react";
import { usePDF } from "react-to-pdf";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type InvoiceItem = {
  id?: string;
  product_id: string;
  product_name: string;
  product_barcode?: string | null;
  product_watt?: number | null;
  product_size?: string | null;
  product_color?: string | null;
  product_model?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_outer_product: boolean;
  buying_price: number;
};

type Invoice = {
  id: string;
  invoice_number: string;
  created_at: string;
  total_amount: number;
  advance_payment: number;
  remaining_amount: number;
  status: "paid" | "partially_paid" | "unpaid";
  supplier_id?: string;
  shop_id: string;
  supplier_name?: string;
  shop_name?: string;
  shop_address?: string;
  shop_phone?: string;
  supplier_details?: any;
  shop_details?: any;
  invoice_items?: InvoiceItem[];
  payments?: any[];
  invoice_type?: "sales" | "product_addition";
  notes?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_id?: string;
  customer_details?: any;
};

export function ModernInvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [editedInvoice, setEditedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [previousDues, setPreviousDues] = useState<number>(0);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const { toPDF, targetRef } = usePDF({
    filename: `invoice-${invoice?.invoice_number}.pdf`,
    page: {
      margin: 10,
      format: "A4",
    },
    options: {
      compress: true,
      scale: 0.75,
    },
  });

  useEffect(() => {
    if (id) {
      fetchInvoiceDetails(id);
    }
  }, [id]);

  // Calculate total received amount
  const calculateTotalReceived = () => {
    if (!invoice?.payments) return 0;
    return invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
  };

  async function fetchInvoiceDetails(invoiceId: string) {
    try {
      setLoading(true);
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .single();

      if (invoiceError) throw invoiceError;
      if (!invoiceData) throw new Error("Invoice not found");

      let supplierData = null;
      if (invoiceData.supplier_id) {
        const { data, error: supplierError } = await supabase
          .from("suppliers")
          .select("*")
          .eq("id", invoiceData.supplier_id)
          .single();
        if (!supplierError) supplierData = data;
      }

      let customerData = null;
      if (invoiceData.customer_id) {
        const { data, error: customerError } = await supabase
          .from("customers")
          .select("*")
          .eq("id", invoiceData.customer_id)
          .single();
        if (!customerError) customerData = data;

        // Fetch previous dues for this customer
        if (data) {
          const { data: previousInvoices, error: previousInvoicesError } =
            await supabase
              .from("invoices")
              .select("remaining_amount, status")
              .eq("customer_id", invoiceData.customer_id)
              .neq("id", invoiceId); // Exclude current invoice

          if (!previousInvoicesError && previousInvoices) {
            const totalPreviousDues = previousInvoices
              .filter(
                (inv) =>
                  inv.status === "unpaid" || inv.status === "partially_paid",
              )
              .reduce((sum, inv) => sum + (inv.remaining_amount || 0), 0);
            setPreviousDues(totalPreviousDues);
            console.log("Previous dues loaded:", totalPreviousDues);
          }
        }
      }

      let shopData = null;
      if (invoiceData.shop_id) {
        const { data, error: shopError } = await supabase
          .from("shops")
          .select("*")
          .eq("id", invoiceData.shop_id)
          .single();
        if (!shopError) shopData = data;
      }

      const { data: invoiceItemsData, error: invoiceItemsError } =
        await supabase
          .from("invoice_items")
          .select("*, products(id, name, barcode, watt, size, color, model)")
          .eq("invoice_id", invoiceId);

      if (invoiceItemsError) throw invoiceItemsError;

      const processedInvoiceItems = invoiceItemsData?.map((item) => ({
        id: item.id,
        product_id: (item.products && item.products.id) || item.product_id,
        product_name:
          item.product_name ||
          (item.products && item.products.name) ||
          "Unknown Product",
        product_barcode:
          item.barcode || (item.products && item.products.barcode) || null,
        product_watt:
          item.watt || (item.products && item.products.watt) || null,
        product_size:
          item.size || (item.products && item.products.size) || null,
        product_color:
          item.color || (item.products && item.products.color) || null,
        product_model:
          item.model || (item.products && item.products.model) || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        is_outer_product: item.is_outer_product,
        buying_price: item.buying_price,
      }));

      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("payment_date", { ascending: false });

      if (paymentsError) throw paymentsError;

      const invoiceDetails: Invoice = {
        ...invoiceData,
        supplier_name: supplierData?.name || "Unknown Supplier",
        shop_name: shopData?.name || "Unknown Shop",
        shop_address: shopData?.address || "",
        shop_phone: shopData?.phone || "",
        supplier_details: supplierData || {},
        shop_details: shopData || {},
        customer_details: customerData || {},
        invoice_items: processedInvoiceItems || [],
        payments: paymentsData || [],
      };

      setInvoice(invoiceDetails);
      setEditedInvoice({ ...invoiceDetails });
    } catch (error) {
      console.error("Error fetching invoice details:", error);
      toast({
        variant: "destructive",
        title: "Error fetching invoice",
        description:
          error instanceof Error
            ? error.message
            : (error as any)?.message || "An unexpected error occurred",
      });
      navigate("/dashboard/invoices");
    } finally {
      setLoading(false);
    }
  }

  const handlePrint = () => {
    window.print();
  };

  const handleEditToggle = () => {
    if (!isEditing && invoice) {
      setEditedInvoice({ ...invoice });
    }
    setIsEditing(!isEditing);
  };

  const handleInputChange = (
    field: keyof Invoice,
    value: string | number | InvoiceItem[],
  ) => {
    if (editedInvoice) {
      setEditedInvoice({ ...editedInvoice, [field]: value });
    }
  };

  const handleSave = async () => {
    if (!id || !editedInvoice) return;

    try {
      setIsSaving(true);

      const { error: invoiceError } = await supabase
        .from("invoices")
        .update({
          invoice_number: editedInvoice.invoice_number,
          customer_name: editedInvoice.customer_name,
          customer_phone: editedInvoice.customer_phone,
          notes: editedInvoice.notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (invoiceError) throw invoiceError;

      toast({
        title: "Invoice Updated",
        description: "The invoice has been successfully updated",
      });

      setIsEditing(false);
      fetchInvoiceDetails(id);
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast({
        variant: "destructive",
        title: "Error updating invoice",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPayment = async () => {
    if (!id || !invoice) return;

    if (
      !paymentAmount ||
      isNaN(Number(paymentAmount)) ||
      Number(paymentAmount) <= 0
    ) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a valid payment amount",
      });
      return;
    }

    if (Number(paymentAmount) > invoice.remaining_amount) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Payment amount cannot exceed remaining balance",
      });
      return;
    }

    try {
      setIsSubmittingPayment(true);
      const { error: paymentError } = await supabase.from("payments").insert({
        invoice_id: id,
        amount: Number(paymentAmount),
        payment_method: paymentMethod,
        notes: paymentNotes,
        payment_date: new Date().toISOString(),
      });

      if (paymentError) throw paymentError;

      const newRemainingAmount = Math.max(
        0,
        invoice.remaining_amount - Number(paymentAmount),
      );
      const newStatus = newRemainingAmount <= 0 ? "paid" : "partially_paid";

      const { error: invoiceError } = await supabase
        .from("invoices")
        .update({
          remaining_amount: newRemainingAmount,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (invoiceError) throw invoiceError;

      toast({
        title: "Payment Recorded",
        description: `Payment of ${Number(paymentAmount).toFixed(2)} successfully recorded`,
      });

      setPaymentAmount("");
      setPaymentMethod("cash");
      setPaymentNotes("");
      setIsAddPaymentOpen(false);
      fetchInvoiceDetails(id);
    } catch (error) {
      console.error("Error adding payment:", error);
      toast({
        variant: "destructive",
        title: "Payment Error",
        description:
          error instanceof Error ? error.message : "Failed to process payment",
      });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const calculateSubtotal = () => {
    if (!invoice?.invoice_items) return 0;
    return invoice.invoice_items.reduce(
      (sum, item) => sum + item.total_price,
      0,
    );
  };

  const calculateDiscountAmount = () => {
    if (!invoice?.notes) return 0;
    const discountMatch = invoice.notes.match(/Discount: ([\d.]+)/);
    return discountMatch ? parseFloat(discountMatch[1]) : 0;
  };

  const calculateTaxAmount = () => {
    if (!invoice?.notes) return 0;
    const taxMatch = invoice.notes.match(/Tax: ([\d.]+)/);
    return taxMatch ? parseFloat(taxMatch[1]) : 0;
  };

  const calculateTaxRate = () => {
    const subtotal = calculateSubtotal();
    const taxAmount = calculateTaxAmount();
    if (subtotal === 0) return 0;
    return (taxAmount / subtotal) * 100;
  };

  // Function to convert number to words
  const convertToWords = (amount: number) => {
    const ones = [
      "",
      "ONE",
      "TWO",
      "THREE",
      "FOUR",
      "FIVE",
      "SIX",
      "SEVEN",
      "EIGHT",
      "NINE",
      "TEN",
      "ELEVEN",
      "TWELVE",
      "THIRTEEN",
      "FOURTEEN",
      "FIFTEEN",
      "SIXTEEN",
      "SEVENTEEN",
      "EIGHTEEN",
      "NINETEEN",
    ];
    const tens = [
      "",
      "",
      "TWENTY",
      "THIRTY",
      "FORTY",
      "FIFTY",
      "SIXTY",
      "SEVENTY",
      "EIGHTY",
      "NINETY",
    ];

    const numToWords = (num: number) => {
      if (num < 20) return ones[num];
      if (num < 100)
        return (
          tens[Math.floor(num / 10)] +
          (num % 10 !== 0 ? " " + ones[num % 10] : "")
        );
      if (num < 1000)
        return (
          ones[Math.floor(num / 100)] +
          " HUNDRED" +
          (num % 100 !== 0 ? " " + numToWords(num % 100) : "")
        );
      if (num < 100000)
        return (
          numToWords(Math.floor(num / 1000)) +
          " THOUSAND" +
          (num % 1000 !== 0 ? " " + numToWords(num % 1000) : "")
        );
      return (
        numToWords(Math.floor(num / 100000)) +
        " LAKH" +
        (num % 100000 !== 0 ? " " + numToWords(num % 100000) : "")
      );
    };

    const wholePart = Math.floor(amount);
    const decimalPart = Math.round((amount - wholePart) * 100);

    let result = numToWords(wholePart) + " TAKA";
    if (decimalPart > 0) {
      result += " AND " + numToWords(decimalPart) + " PAISA";
    }

    return result + " ONLY.";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!invoice || !editedInvoice) {
    return (
      <div className="text-center py-10 text-gray-500 text-sm">
        Invoice not found or has been deleted.
      </div>
    );
  }

  const subtotal = calculateSubtotal();
  const taxRate = calculateTaxRate();
  const taxAmount = calculateTaxAmount();
  const discountAmount = calculateDiscountAmount();
  const afterDiscountAmount = subtotal - discountAmount;
  const total = afterDiscountAmount + taxAmount;
  const totalReceived = calculateTotalReceived();
  const currentDue = invoice.remaining_amount + previousDues;

  // Check if any invoice items have these attributes
  const hasWatt = invoice.invoice_items?.some(
    (item) =>
      item.product_watt !== null &&
      item.product_watt !== undefined &&
      item.product_watt !== 0,
  );
  const hasSize = invoice.invoice_items?.some(
    (item) => item.product_size !== null && item.product_size !== "",
  );
  const hasColor = invoice.invoice_items?.some(
    (item) => item.product_color !== null && item.product_color !== "",
  );
  const hasModel = invoice.invoice_items?.some(
    (item) => item.product_model !== null && item.product_model !== "",
  );

  return (
    <div className="space-y-4 text-sm">
      <div className="flex justify-between items-center print:hidden">
        <Button
          variant="outline"
          onClick={() => navigate("/dashboard/invoices")}
          className="flex items-center gap-1 text-xs p-2"
        >
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleEditToggle}
                className="flex items-center gap-1 text-xs p-2"
                disabled={isSaving}
              >
                <X className="h-3 w-3" /> Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-xs p-2"
                disabled={isSaving}
              >
                <Save className="h-3 w-3" /> {isSaving ? "Saving..." : "Save"}
              </Button>
            </>
          ) : (
            <>
              {invoice.remaining_amount > 0 && (
                <Button
                  onClick={() => setIsAddPaymentOpen(true)}
                  className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-xs p-2"
                >
                  <Plus className="h-3 w-3" /> Payment
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handlePrint}
                className="flex items-center gap-1 text-xs p-2"
              >
                <Printer className="h-3 w-3" /> Print
              </Button>
              {invoice.invoice_type === "sales" && (
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate(
                      `/dashboard/sell-product?invoice_id=${invoice.id}&customer_id=${invoice.customer_id || ""}&customer_name=${invoice.customer_name || ""}&customer_phone=${invoice.customer_phone || ""}&advance_payment=${invoice.advance_payment || 0}&remaining_amount=${invoice.remaining_amount || 0}`,
                    )
                  }
                  className="flex items-center gap-1 border-green-600 text-green-600 hover:bg-green-50 text-xs p-2"
                >
                  <ShoppingCart className="h-3 w-3" /> Add More Products
                </Button>
              )}
              <Button
                onClick={() => toPDF()}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-xs p-2"
              >
                <Download className="h-3 w-3" /> Download PDF
              </Button>
              <Button
                variant="outline"
                onClick={handleEditToggle}
                className="flex items-center gap-1 text-xs p-2"
              >
                <Edit2 className="h-3 w-3" /> Edit
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="flex items-center gap-1 text-xs p-2 border-red-600 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <style type="text/css" media="print">
        {`
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            margin: 0 !important;
            font-size: 10pt;
            line-height: 1.3;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          * {
            overflow: visible !important;
          }
          .no-print, .no-print * {
            display: none !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:border {
            border: 1px solid #e5e7eb !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
        `}
      </style>

      <Card
        className="border border-gray-200 shadow-sm print:border print:shadow-none max-w-5xl mx-auto"
        ref={targetRef}
      >
        <CardContent className="p-6">
          {/* Main invoice container with border */}
          <div className="border border-gray-200">
            {/* Header section with company info */}
            <div className="p-6 border-b border-gray-200 text-center">
              <div className="flex flex-col items-center">
                <h1 className="text-2xl font-bold uppercase">
                  SHAHJALAL LIGHTING{" "}
                </h1>
                <p className="text-gray-600">
                  119/24, Foyez Electric Market Nandankanan, Chittagong
                </p>
                <p className="text-gray-600">
                  Mobile: 031-2859667, 01979-500055
                </p>
                <p className="text-gray-600">E-mail: mslctg444@gmail.com</p>
                <div className="mt-2  rounded-full px-8 py-1 inline-block">
                  <h2 className="text-xl font-bold">INVOICE/BILL</h2>
                </div>
              </div>
            </div>

            {/* Customer and Invoice details section */}
            <div className="grid grid-cols-1 md:grid-cols-2 border-b border-gray-200">
              <div className="p-4">
                <div className="mb-4">
                  <span className="font-bold">Customer Name</span>
                  {isEditing ? (
                    <Input
                      value={editedInvoice.customer_name || ""}
                      onChange={(e) =>
                        handleInputChange("customer_name", e.target.value)
                      }
                      className="mt-1 text-sm"
                    />
                  ) : (
                    <span className="ml-2">
                      {invoice.customer_name || "Customer"}
                    </span>
                  )}
                </div>
                <div className="mb-4">
                  <span className="font-bold">Address</span>
                  <div className="ml-2">
                    {invoice.customer_details?.address || ""}
                  </div>
                </div>
                <div>
                  <span className="font-bold">Phone No.</span>
                  {isEditing ? (
                    <Input
                      value={editedInvoice.customer_phone || ""}
                      onChange={(e) =>
                        handleInputChange("customer_phone", e.target.value)
                      }
                      className="mt-1 text-sm"
                    />
                  ) : (
                    <span className="ml-2">{invoice.customer_phone || ""}</span>
                  )}
                </div>
              </div>
              <div className="p-4">
                <div className="mb-2">
                  <span className="font-bold">Invoice No:</span>
                  <span className="ml-2">{invoice.invoice_number}</span>
                </div>
                <div className="mb-2">
                  <span className="font-bold">Ref No:</span>
                  <span className="ml-2"></span>
                </div>
                <div className="mb-2">
                  <span className="font-bold">Sold By:</span>
                  <span className="ml-2"></span>
                </div>
                <div className="mb-2">
                  <span className="font-bold">Print Date & Time:</span>
                  <span className="ml-2">
                    {format(new Date(), "dd-MMM-yyyy h:mm a")}
                  </span>
                </div>
                <div>
                  <span className="font-bold">Sales Date & Time:</span>
                  <span className="ml-2">
                    {format(new Date(invoice.created_at), "dd-MMM-yyyy h:mm a")}
                  </span>
                </div>
              </div>
            </div>

            {/* Invoice Items Table */}
            <div className="border-b border-gray-200">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 border">
                    <th className="py-2 px-2 text-left border">SL.</th>
                    <th className="py-2 px-2 text-left border">Description</th>
                    {hasWatt && (
                      <th className="py-2 px-2 text-center border">Watt</th>
                    )}
                    {hasSize && (
                      <th className="py-2 px-2 text-center border">Size</th>
                    )}
                    {hasColor && (
                      <th className="py-2 px-2 text-center border">Color</th>
                    )}
                    {hasModel && (
                      <th className="py-2 px-2 text-center border">Model</th>
                    )}
                    <th className="py-2 px-2 text-center border">Qty</th>
                    <th className="py-2 px-2 text-right border">U. Price</th>
                    <th className="py-2 px-2 text-right border">Total</th>
                    <th className="py-2 px-2 text-right border">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.invoice_items && invoice.invoice_items.length > 0 ? (
                    invoice.invoice_items.map((item, index) => (
                      <tr key={item.id || index} className="border">
                        <td className="py-2 px-2 border">{index + 1}</td>
                        <td className="py-2 px-2 border">
                          {item.product_name}
                        </td>
                        {hasWatt && (
                          <td className="py-2 px-2 text-center border">
                            {item.product_watt || "-"}
                          </td>
                        )}
                        {hasSize && (
                          <td className="py-2 px-2 text-center border">
                            {item.product_size || "-"}
                          </td>
                        )}
                        {hasColor && (
                          <td className="py-2 px-2 text-center border">
                            {item.product_color || "-"}
                          </td>
                        )}
                        {hasModel && (
                          <td className="py-2 px-2 text-center border">
                            {item.product_model || "-"}
                          </td>
                        )}
                        <td className="py-2 px-2 text-center border">
                          {item.quantity}
                        </td>
                        <td className="py-2 px-2 text-right border">
                          {Number(item.unit_price).toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right border">
                          {Number(item.total_price).toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right border">
                          {Number(item.total_price).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={
                          6 +
                          (hasWatt ? 1 : 0) +
                          (hasSize ? 1 : 0) +
                          (hasColor ? 1 : 0) +
                          (hasModel ? 1 : 0)
                        }
                        className="py-4 px-2 text-center text-gray-500 border"
                      >
                        No items found in this invoice
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Due Bill and Summary section */}
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-4 border-r border-gray-200">
                <h2 className="text-2xl font-bold mb-4">Due Bill</h2>
                <p className="text-sm uppercase font-bold mt-8">
                  IN WORDS:{" "}
                  {invoice.remaining_amount + previousDues
                    ? convertToWords(invoice.remaining_amount + previousDues)
                    : ""}
                </p>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Total Amount</span>
                    <span>{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Item Wise Discount</span>
                    <span>{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Bill Wise Discount</span>
                    <span className="text-red-600">
                      -{discountAmount.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="font-medium">After Discount Amount</span>
                    <span className="font-medium">
                      {afterDiscountAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Advance Payment</span>
                    <span className="text-green-600">
                      {(invoice.advance_payment || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between border-t border-gray-300 pt-2">
                    <span className="font-bold">Net Payable Amount</span>
                    <span className="font-bold">{total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Previous Due Amount</span>
                    <span className="font-medium text-red-600">
                      {previousDues.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Total Received Amount</span>
                    <span className="text-green-600">
                      {(
                        invoice.payments?.reduce(
                          (sum, payment) => sum + payment.amount,
                          0,
                        ) || 0
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-gray-300 pt-2">
                    <span className="font-bold">Current Due Amount</span>
                    <span className="font-bold text-red-600">
                      {(invoice.remaining_amount + previousDues).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Record Payment</DialogTitle>
            <DialogDescription className="text-xs">
              Add payment for Invoice #{invoice?.invoice_number} - Balance: $
              {invoice?.remaining_amount.toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div className="grid grid-cols-4 items-center gap-3">
              <Label htmlFor="amount" className="text-right text-xs">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={invoice?.remaining_amount}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="col-span-3 text-xs"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label htmlFor="method" className="text-right text-xs">
                Method
              </Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="col-span-3 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Credit Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label htmlFor="notes" className="text-right text-xs">
                Notes
              </Label>
              <Input
                id="notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="col-span-3 text-xs"
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddPaymentOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddPayment}
              disabled={isSubmittingPayment}
              className="text-xs"
            >
              {isSubmittingPayment ? "Processing..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete this invoice?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete Invoice #
              {invoice?.invoice_number}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                if (!id) return;

                try {
                  setIsDeleting(true);

                  const { error: itemsError } = await supabase
                    .from("invoice_items")
                    .delete()
                    .eq("invoice_id", id);

                  if (itemsError) throw itemsError;

                  const { error: paymentsError } = await supabase
                    .from("payments")
                    .delete()
                    .eq("invoice_id", id);

                  if (paymentsError) throw paymentsError;

                  const { error: invoiceError } = await supabase
                    .from("invoices")
                    .delete()
                    .eq("id", id);

                  if (invoiceError) throw invoiceError;

                  toast({
                    title: "Invoice deleted",
                    description: `Invoice #${invoice?.invoice_number} has been successfully deleted.`,
                  });

                  navigate("/dashboard/invoices");
                } catch (error) {
                  console.error("Error deleting invoice:", error);
                  toast({
                    variant: "destructive",
                    title: "Error deleting invoice",
                    description:
                      error instanceof Error ? error.message : String(error),
                  });
                } finally {
                  setIsDeleting(false);
                  setIsDeleteDialogOpen(false);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
