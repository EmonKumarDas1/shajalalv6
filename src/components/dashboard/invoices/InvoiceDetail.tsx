import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../../supabase/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import {
  ArrowLeft,
  Download,
  Printer,
  Plus,
  RotateCcw,
  Edit2,
  Save,
  X,
  ShoppingCart,
  FileText,
  Trash2,
} from "lucide-react";
import { usePDF } from "react-to-pdf";
import { ReturnForm } from "../returns/ReturnForm";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [editedInvoice, setEditedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const { toPDF, targetRef } = usePDF({
    filename: `invoice-${invoice?.invoice_number}.pdf`,
  });

  useEffect(() => {
    if (id) {
      fetchInvoiceDetails(id);
    }
  }, [id]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "border-green-600 bg-green-100 text-green-800";
      case "partially_paid":
        return "border-yellow-600 bg-yellow-100 text-yellow-800";
      case "unpaid":
        return "border-red-600 bg-red-100 text-red-800";
      default:
        return "border-gray-600 bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "paid":
        return "PAID";
      case "partially_paid":
        return "PARTIALLY PAID";
      case "unpaid":
        return "UNPAID";
      default:
        return status.toUpperCase();
    }
  };

  const handlePrint = () => {
    window.print();
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
        description: `Payment of $${Number(paymentAmount).toFixed(2)} successfully recorded`,
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

  const handleItemChange = (
    index: number,
    field: keyof InvoiceItem,
    value: string | number | null,
  ) => {
    if (editedInvoice && editedInvoice.invoice_items) {
      const updatedItems = [...editedInvoice.invoice_items];
      updatedItems[index] = { ...updatedItems[index], [field]: value };

      if (field === "quantity" || field === "unit_price") {
        updatedItems[index].total_price =
          Number(updatedItems[index].quantity) *
          Number(updatedItems[index].unit_price);
      }

      const newTotalAmount = updatedItems.reduce(
        (sum, item) => sum + item.total_price,
        0,
      );
      const newRemainingAmount = Math.max(
        0,
        newTotalAmount - editedInvoice.advance_payment,
      );
      const newStatus =
        newRemainingAmount <= 0
          ? "paid"
          : newTotalAmount === newRemainingAmount
            ? "unpaid"
            : "partially_paid";

      setEditedInvoice({
        ...editedInvoice,
        invoice_items: updatedItems,
        total_amount: newTotalAmount,
        remaining_amount: newRemainingAmount,
        status: newStatus,
      });
    }
  };

  const handleSave = async () => {
    if (!id || !editedInvoice) return;

    if (!editedInvoice.invoice_number.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Invoice number is required",
      });
      return;
    }

    if (
      !editedInvoice.invoice_items ||
      editedInvoice.invoice_items.length === 0
    ) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Invoice must have at least one item",
      });
      return;
    }

    for (const item of editedInvoice.invoice_items) {
      if (!item.product_name.trim()) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Product name is required for all items",
        });
        return;
      }
      if (
        !item.quantity ||
        isNaN(Number(item.quantity)) ||
        Number(item.quantity) <= 0
      ) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: `Invalid quantity for ${item.product_name}`,
        });
        return;
      }
      if (
        !item.unit_price ||
        isNaN(Number(item.unit_price)) ||
        Number(item.unit_price) <= 0
      ) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: `Invalid unit price for ${item.product_name}`,
        });
        return;
      }
      if (
        item.product_watt &&
        (isNaN(Number(item.product_watt)) || Number(item.product_watt) <= 0)
      ) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: `Invalid watt for ${item.product_name}`,
        });
        return;
      }
    }

    try {
      setIsSaving(true);

      const { error: invoiceError } = await supabase
        .from("invoices")
        .update({
          invoice_number: editedInvoice.invoice_number,
          total_amount: editedInvoice.total_amount,
          advance_payment: editedInvoice.advance_payment,
          remaining_amount: editedInvoice.remaining_amount,
          status: editedInvoice.status,
          notes: editedInvoice.notes,
          customer_name: editedInvoice.customer_name,
          customer_phone: editedInvoice.customer_phone,
          created_at: editedInvoice.created_at,
          updated_at: new Date().toISOString(),
          invoice_type: editedInvoice.invoice_type,
        })
        .eq("id", id);

      if (invoiceError) throw invoiceError;

      for (const item of editedInvoice.invoice_items) {
        if (item.id) {
          const { error: itemError } = await supabase
            .from("invoice_items")
            .update({
              product_name: item.product_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
              barcode: item.product_barcode?.trim() || null,
              watt: item.product_watt ? Number(item.product_watt) : null,
              size: item.product_size?.trim() || null,
              color: item.product_color?.trim() || null,
              model: item.product_model?.trim() || null,
            })
            .eq("id", item.id);

          if (itemError) throw itemError;
        } else {
          const { error: itemError } = await supabase
            .from("invoice_items")
            .insert({
              invoice_id: id,
              product_id: item.product_id,
              product_name: item.product_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
              barcode: item.product_barcode?.trim() || null,
              watt: item.product_watt ? Number(item.product_watt) : null,
              size: item.product_size?.trim() || null,
              color: item.product_color?.trim() || null,
              model: item.product_model?.trim() || null,
            });

          if (itemError) throw itemError;
        }
      }

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

  const getDiscountAmount = () => {
    if (!editedInvoice?.notes) return 0;
    const discountMatch = editedInvoice.notes.match(/Discount: ([\d.]+)/);
    return discountMatch ? parseFloat(discountMatch[1]) : 0;
  };

  const getTaxAmount = () => {
    if (!editedInvoice?.notes) return 0;
    const taxMatch = editedInvoice.notes.match(/Tax: ([\d.]+)/);
    return taxMatch ? parseFloat(taxMatch[1]) : 0;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
      </div>
    );
  }

  if (!invoice || !editedInvoice) {
    return (
      <div className="text-center py-8 text-gray-600 text-sm">
        Invoice not found
      </div>
    );
  }

  const discountAmount = getDiscountAmount();
  const subtotalBeforeDiscount = editedInvoice.total_amount + discountAmount;
  const advanceAmount = editedInvoice.advance_payment;
  const advancePercentage =
    editedInvoice.total_amount > 0
      ? (advanceAmount / editedInvoice.total_amount) * 100
      : 0;

  return (
    <div className="space-y-4 print:space-y-0 text-sm">
      <style>
        {`
          @media print {
            @page {
              size: A4;
              margin: 10mm;
            }
            body {
              font-size: 10pt;
              line-height: 1.2;
            }
            .print\\:hidden {
              display: none;
            }
            .print\\:border {
              border: 1px solid #e5e7eb;
            }
            .print\\:shadow-none {
              box-shadow: none;
            }
            .card-content {
              padding: 8mm !important;
            }
            table {
              font-size: 9pt !important;
            }
            .no-print {
              display: none;
            }
            .print-compact {
              margin: 0 !important;
              padding: 0 !important;
            }
          }
        `}
      </style>
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
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsReturnDialogOpen(true)}
                    className="flex items-center gap-1 border-orange-600 text-orange-600 hover:bg-orange-50 text-xs p-2"
                  >
                    <RotateCcw className="h-3 w-3" /> Return
                  </Button>
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
                </>
              )}
              <Button
                onClick={() => toPDF()}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-xs p-2"
              >
                <Download className="h-3 w-3" /> PDF
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

      <Card
        className="border-none print:border print:shadow-none"
        ref={targetRef}
      >
        <CardContent className="p-4 card-content">
          <div className="mb-6 bg-gradient-to-r from-blue-100 via-blue-50 to-white p-4 rounded-md border border-blue-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-md shadow-sm border border-blue-100">
                  <img
                    src="https://i.ibb.co/B2MzGc7Y/Screenshot-2025-04-20-195658.png"
                    alt="Shahjalal Lighting Logo"
                    className="h-14 w-auto object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-blue-900">
                    SHAHJALAL LIGHTING
                  </h1>
                  <p className="text-xs text-gray-700">
                    1st Class Contractor, Importer & Suppliers
                  </p>
                  <p className="text-[10px] font-semibold text-green-700 inline-block px-2 py-0.5 mt-1 rounded bg-green-50 border border-green-100">
                    ELECTRICAL GOODS WHOLESALER & RETAILER
                  </p>
                </div>
              </div>
              <div className="text-right text-xs bg-white p-2 rounded-md border border-gray-100 shadow-sm">
                <p>119/24, Foyez Electric Market</p>
                <p>Nandankanan, Chittagong</p>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <svg
                    className="w-3 h-3 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    ></path>
                  </svg>
                  <p>031-2859667, 01979-500055</p>
                </div>
                <p className="mt-0.5">mslctg444@gmail.com</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 pt-3 border-t border-blue-200">
              <div className="flex items-center gap-2">
                <div className="bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  <p className="text-xs font-medium text-blue-800">
                    Date:{" "}
                    {new Date(editedInvoice.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  <p className="text-xs font-medium text-blue-800">
                    Type:{" "}
                    {editedInvoice.invoice_type === "sales"
                      ? "Sales"
                      : "Purchase"}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center mt-2 sm:mt-0">
                {isEditing ? (
                  <Input
                    value={editedInvoice.invoice_number}
                    onChange={(e) =>
                      handleInputChange("invoice_number", e.target.value)
                    }
                    className="text-xs text-center mx-auto w-32"
                  />
                ) : (
                  <div className="bg-white px-4 py-1 rounded-full border border-gray-200 shadow-sm">
                    <p className="text-sm font-medium text-gray-700">
                      Invoice #{editedInvoice.invoice_number}
                    </p>
                  </div>
                )}
                <Badge
                  variant="outline"
                  className={`mt-2 ${getStatusColor(editedInvoice.status)} font-semibold text-xs px-3 py-0.5`}
                >
                  {getStatusLabel(editedInvoice.status)}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
              <h2 className="text-xs font-semibold text-gray-700 uppercase flex items-center gap-1 mb-2">
                <svg
                  className="w-3 h-3 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  ></path>
                </svg>
                {editedInvoice.invoice_type === "sales"
                  ? "Customer Information"
                  : "Supplier Information"}
              </h2>
              {isEditing ? (
                <div className="space-y-2">
                  <div>
                    <Label
                      htmlFor="customer-name"
                      className="text-xs text-gray-600"
                    >
                      Name
                    </Label>
                    <Input
                      id="customer-name"
                      value={editedInvoice.customer_name || ""}
                      onChange={(e) =>
                        handleInputChange("customer_name", e.target.value)
                      }
                      placeholder="Customer Name"
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="customer-phone"
                      className="text-xs text-gray-600"
                    >
                      Phone
                    </Label>
                    <Input
                      id="customer-phone"
                      value={editedInvoice.customer_phone || ""}
                      onChange={(e) =>
                        handleInputChange("customer_phone", e.target.value)
                      }
                      placeholder="Customer Phone"
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-1 space-y-1 bg-gray-50 p-2 rounded-md">
                  <p className="text-sm font-medium text-gray-800">
                    {editedInvoice.invoice_type === "sales"
                      ? editedInvoice.customer_name ||
                        editedInvoice.customer_details?.name ||
                        "Unknown Customer"
                      : editedInvoice.supplier_name}
                  </p>
                  {editedInvoice.invoice_type === "sales" &&
                    (editedInvoice.customer_phone ||
                      editedInvoice.customer_details?.phone) && (
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <svg
                          className="w-3 h-3 text-gray-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          ></path>
                        </svg>
                        <span>
                          {editedInvoice.customer_phone ||
                            editedInvoice.customer_details?.phone}
                        </span>
                      </div>
                    )}
                  {editedInvoice.invoice_type === "sales" &&
                    editedInvoice.customer_details?.address && (
                      <div className="flex items-start gap-1 text-xs text-gray-600">
                        <svg
                          className="w-3 h-3 text-gray-500 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          ></path>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          ></path>
                        </svg>
                        <span>{editedInvoice.customer_details.address}</span>
                      </div>
                    )}
                </div>
              )}
            </div>

            <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
              <h2 className="text-xs font-semibold text-gray-700 uppercase flex items-center gap-1 mb-2">
                <svg
                  className="w-3 h-3 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  ></path>
                </svg>
                Invoice Details
              </h2>
              <div className="mt-1 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 p-2 rounded">
                    <p className="text-xs font-medium text-gray-600">
                      Invoice Date:
                    </p>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={
                          new Date(editedInvoice.created_at)
                            .toISOString()
                            .split("T")[0]
                        }
                        onChange={(e) =>
                          handleInputChange("created_at", e.target.value)
                        }
                        className="text-xs mt-1"
                      />
                    ) : (
                      <p className="text-sm text-gray-800">
                        {new Date(
                          editedInvoice.created_at,
                        ).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <p className="text-xs font-medium text-gray-600">
                      Invoice Type:
                    </p>
                    {isEditing ? (
                      <Select
                        value={editedInvoice.invoice_type}
                        onValueChange={(value) =>
                          handleInputChange("invoice_type", value)
                        }
                      >
                        <SelectTrigger className="text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sales">Sales</SelectItem>
                          <SelectItem value="product_addition">
                            Purchase
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-gray-800">
                        {editedInvoice.invoice_type === "sales"
                          ? "Sales"
                          : "Purchase"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Additional invoice metadata could go here */}
                {editedInvoice.shop_name && (
                  <div className="bg-gray-50 p-2 rounded">
                    <p className="text-xs font-medium text-gray-600">Shop:</p>
                    <p className="text-sm text-gray-800">
                      {editedInvoice.shop_name}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-gray-300">
                    <th className="py-2 px-3 text-left font-semibold text-blue-800">
                      Description
                    </th>
                    <th className="py-2 px-3 text-left font-semibold text-blue-800">
                      Watt
                    </th>
                    <th className="py-2 px-3 text-left font-semibold text-blue-800">
                      Color
                    </th>
                    <th className="py-2 px-3 text-left font-semibold text-blue-800">
                      Model
                    </th>
                    <th className="py-2 px-3 text-left font-semibold text-blue-800">
                      Size
                    </th>
                    <th className="py-2 px-3 text-center font-semibold text-blue-800">
                      Qty
                    </th>
                    <th className="py-2 px-3 text-right font-semibold text-blue-800">
                      Unit Price
                    </th>
                    <th className="py-2 px-3 text-right font-semibold text-blue-800">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {editedInvoice.invoice_items &&
                  editedInvoice.invoice_items.length > 0 ? (
                    editedInvoice.invoice_items.map((item, index) => (
                      <tr
                        key={item.id || index}
                        className={`border-b ${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors duration-150`}
                      >
                        <td className="py-3 px-3">
                          {isEditing ? (
                            <Input
                              value={item.product_name}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "product_name",
                                  e.target.value,
                                )
                              }
                              className="text-xs"
                            />
                          ) : (
                            <>
                              <p className="font-medium text-gray-800">
                                {item.product_name}
                              </p>
                              {item.product_barcode && (
                                <p className="text-[10px] text-gray-500 mt-1">
                                  Barcode: {item.product_barcode}
                                </p>
                              )}
                              {item.is_outer_product && (
                                <Badge
                                  variant="outline"
                                  className="mt-1 text-[9px] bg-blue-50 text-blue-700 border-blue-200"
                                >
                                  Outer Product
                                </Badge>
                              )}
                            </>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={item.product_watt || ""}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "product_watt",
                                  e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                )
                              }
                              className="text-xs h-7"
                              placeholder="Watt"
                              min="0"
                            />
                          ) : (
                            <span className="text-gray-800">
                              {item.product_watt
                                ? `${item.product_watt}W`
                                : "-"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {isEditing ? (
                            <Input
                              value={item.product_color || ""}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "product_color",
                                  e.target.value,
                                )
                              }
                              className="text-xs h-7"
                              placeholder="Color"
                            />
                          ) : (
                            <span className="text-gray-800">
                              {item.product_color || "-"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {isEditing ? (
                            <Input
                              value={item.product_model || ""}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "product_model",
                                  e.target.value,
                                )
                              }
                              className="text-xs h-7"
                              placeholder="Model"
                            />
                          ) : (
                            <span className="text-gray-800">
                              {item.product_model || "-"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {isEditing ? (
                            <Input
                              value={item.product_size || ""}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "product_size",
                                  e.target.value,
                                )
                              }
                              className="text-xs h-7"
                              placeholder="Size"
                            />
                          ) : (
                            <span className="text-gray-800">
                              {item.product_size || "-"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "quantity",
                                  Number(e.target.value),
                                )
                              }
                              className="text-xs w-16 mx-auto text-center"
                              min="1"
                            />
                          ) : (
                            <span className="font-medium text-gray-800">
                              {item.quantity}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "unit_price",
                                  Number(e.target.value),
                                )
                              }
                              className="text-xs w-24 ml-auto"
                              step="0.01"
                              min="0"
                            />
                          ) : (
                            <span className="font-medium text-gray-800">
                              ${Number(item.unit_price).toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="font-medium text-gray-800">
                            ${Number(item.total_price).toFixed(2)}
                          </div>
                          {item.is_outer_product && item.buying_price > 0 && (
                            <p className="text-xs text-green-600 mt-1">
                              Profit: $
                              {(
                                item.total_price -
                                item.buying_price * item.quantity
                              ).toFixed(2)}
                              {invoice.status !== "paid" && (
                                <span className="text-amber-500 ml-1">
                                  (on payment)
                                </span>
                              )}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 px-3 text-center text-gray-500"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <FileText className="h-8 w-8 text-gray-300 mb-2" />
                          <p>No items found in this invoice</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end mb-4">
            <div className="w-80 text-xs bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="font-medium text-sm text-gray-700 mb-3 pb-1 border-b border-gray-200">
                Invoice Summary
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between py-1 bg-white px-3 rounded">
                  <span className="font-semibold text-gray-600">Subtotal:</span>
                  <span className="text-gray-800">
                    ${subtotalBeforeDiscount.toFixed(2)}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between py-1 bg-white px-3 rounded">
                    <span className="font-semibold text-gray-600">
                      Discount:
                    </span>
                    <span className="text-green-600 font-medium">
                      -${discountAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                {getTaxAmount() > 0 && (
                  <div className="flex justify-between py-1 bg-white px-3 rounded">
                    <span className="font-semibold text-gray-600">Tax:</span>
                    <span className="text-gray-800">
                      ${getTaxAmount().toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-t border-gray-200 mt-1">
                  <span className="font-semibold text-gray-700">Total:</span>
                  <span className="font-semibold text-gray-800">
                    ${editedInvoice.total_amount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1 bg-white px-3 rounded">
                  <span className="font-semibold text-gray-600">Paid:</span>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editedInvoice.advance_payment}
                      onChange={(e) =>
                        handleInputChange(
                          "advance_payment",
                          Number(e.target.value),
                        )
                      }
                      className="text-xs w-24"
                      step="0.01"
                      min="0"
                    />
                  ) : (
                    <span className="text-blue-600 font-medium">
                      $
                      {(
                        editedInvoice.total_amount -
                        editedInvoice.remaining_amount
                      ).toFixed(2)}{" "}
                      <span className="text-xs text-gray-500">
                        ({advancePercentage.toFixed(1)}%)
                      </span>
                    </span>
                  )}
                </div>
                <div className="flex justify-between py-2 mt-1 bg-blue-50 px-3 rounded-md border border-blue-100">
                  <span className="font-bold text-blue-800">Balance Due:</span>
                  <span
                    className={`font-bold ${editedInvoice.remaining_amount > 0 ? "text-red-600" : "text-green-600"}`}
                  >
                    ${editedInvoice.remaining_amount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment history section */}
              {invoice.payments && invoice.payments.length > 0 && (
                <div className="mt-4 pt-2 border-t border-gray-200">
                  <h4 className="font-medium text-xs text-gray-700 mb-2">
                    Payment History
                  </h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {invoice.payments.map((payment, idx) => (
                      <div
                        key={idx}
                        className="text-[10px] flex justify-between bg-white p-1 rounded"
                      >
                        <span className="text-gray-600">
                          {new Date(payment.payment_date).toLocaleDateString()}
                          <span className="ml-1 text-gray-400">
                            ({payment.payment_method})
                          </span>
                        </span>
                        <span className="text-green-600">
                          ${Number(payment.amount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mb-4">
            <Label className="text-xs font-semibold text-gray-600">Notes</Label>
            {isEditing ? (
              <Input
                value={editedInvoice.notes || ""}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                className="text-xs mt-1"
                placeholder="Enter notes (e.g., Discount: 10)"
              />
            ) : (
              <p className="text-xs text-gray-500 mt-1">
                {editedInvoice.notes || "No notes"}
              </p>
            )}
          </div>

          <div className="text-center text-[10px] text-gray-500 border-t pt-2">
            <p>Thank you for your business with SHAHJALAL LIGHTING</p>
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

      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="text-sm">Initiate Return</DialogTitle>
            <DialogDescription className="text-xs">
              Process return for Invoice #{invoice?.invoice_number}
            </DialogDescription>
          </DialogHeader>
          <ReturnForm
            invoice={invoice}
            onSuccess={() => {
              setIsReturnDialogOpen(false);
              toast({
                title: "Return Processed",
                description: "Return request successfully created",
              });
            }}
            onCancel={() => setIsReturnDialogOpen(false)}
          />
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

                  // First delete related invoice items
                  const { error: itemsError } = await supabase
                    .from("invoice_items")
                    .delete()
                    .eq("invoice_id", id);

                  if (itemsError) throw itemsError;

                  // Then delete related payments
                  const { error: paymentsError } = await supabase
                    .from("payments")
                    .delete()
                    .eq("invoice_id", id);

                  if (paymentsError) throw paymentsError;

                  // Finally delete the invoice itself
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
