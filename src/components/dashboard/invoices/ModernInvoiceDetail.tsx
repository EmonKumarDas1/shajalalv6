import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../../supabase/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { usePDF } from "react-to-pdf";
import { format } from "date-fns";

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
  const [loading, setLoading] = useState(true);
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

  const calculateSubtotal = () => {
    if (!invoice?.invoice_items) return 0;
    return invoice.invoice_items.reduce(
      (sum, item) => sum + item.total_price,
      0,
    );
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-10 text-gray-500 text-sm">
        Invoice not found or has been deleted.
      </div>
    );
  }

  const subtotal = calculateSubtotal();
  const taxRate = calculateTaxRate();
  const taxAmount = calculateTaxAmount();
  const total = subtotal + taxAmount;

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
          <Button
            variant="outline"
            onClick={handlePrint}
            className="flex items-center gap-1 text-xs p-2"
          >
            <Printer className="h-3 w-3" /> Print
          </Button>
          <Button
            onClick={() => toPDF()}
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-xs p-2"
          >
            <Download className="h-3 w-3" /> Download PDF
          </Button>
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
            <div className="p-8 border-b border-gray-200">
              <div className="flex flex-col md:flex-row justify-between">
                <div>
                  <h1 className="text-xl font-bold">Zylker Electronics Hub</h1>
                  <p className="text-gray-600">14B, Northern Street</p>
                  <p className="text-gray-600">Greater South Avenue</p>
                  <p className="text-gray-600">New York New York 10001</p>
                  <p className="text-gray-600">U.S.A</p>
                </div>
                <div className="mt-4 md:mt-0 text-right">
                  <h2 className="text-4xl font-bold text-blue-800">INVOICE</h2>
                </div>
              </div>
            </div>

            {/* Invoice details section */}
            <div className="grid grid-cols-1 md:grid-cols-2 border-b border-gray-200">
              <div className="p-8 border-r border-gray-200">
                <table className="w-full">
                  <tbody>
                    <tr>
                      <td className="py-2 font-medium text-gray-600">
                        Invoice#
                      </td>
                      <td className="py-2">{invoice.invoice_number}</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium text-gray-600">
                        Invoice Date
                      </td>
                      <td className="py-2">
                        {format(new Date(invoice.created_at), "dd MMM yyyy")}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium text-gray-600">Terms</td>
                      <td className="py-2">Due on Receipt</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium text-gray-600">
                        Due Date
                      </td>
                      <td className="py-2">
                        {format(new Date(invoice.created_at), "dd MMM yyyy")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="p-8">
                {/* This section intentionally left blank in the template */}
              </div>
            </div>

            {/* Bill To / Ship To section */}
            <div className="grid grid-cols-1 md:grid-cols-2 border-b border-gray-200">
              <div className="p-8 border-r border-gray-200">
                <h3 className="font-bold mb-3">Bill To</h3>
                <p className="font-medium">
                  {invoice.customer_name || "Customer"}
                </p>
                <p className="text-gray-600">
                  {invoice.customer_details?.address || ""}
                </p>
                <p className="text-gray-600">{invoice.customer_phone || ""}</p>
              </div>
              <div className="p-8">
                <h3 className="font-bold mb-3">Ship To</h3>
                <p className="text-gray-600">
                  {invoice.customer_details?.address || ""}
                </p>
                <p className="text-gray-600">{invoice.customer_phone || ""}</p>
              </div>
            </div>

            {/* Invoice Items Table */}
            <div className="border-b border-gray-200">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-blue-800 text-white">
                    <th className="py-3 px-8 text-left">#</th>
                    <th className="py-3 px-8 text-left">Item & Description</th>
                    <th className="py-3 px-8 text-center">Qty</th>
                    <th className="py-3 px-8 text-right">Rate</th>
                    <th className="py-3 px-8 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.invoice_items && invoice.invoice_items.length > 0 ? (
                    invoice.invoice_items.map((item, index) => (
                      <tr
                        key={item.id || index}
                        className={`border-b border-gray-200 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                      >
                        <td className="py-4 px-8">{index + 1}</td>
                        <td className="py-4 px-8">
                          <div>
                            <p className="font-medium">{item.product_name}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              {[
                                item.product_watt
                                  ? `${item.product_watt}W`
                                  : null,
                                item.product_color,
                                item.product_model,
                                item.product_size,
                              ]
                                .filter(Boolean)
                                .join(", ") || "Standard model"}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-8 text-center">
                          {item.quantity.toFixed(2)}
                        </td>
                        <td className="py-4 px-8 text-right">
                          ${Number(item.unit_price).toFixed(2)}
                        </td>
                        <td className="py-4 px-8 text-right">
                          ${Number(item.total_price).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 px-8 text-center text-gray-500"
                      >
                        No items found in this invoice
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer section with summary and terms */}
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-8 border-r border-gray-200">
                <p className="text-gray-600 mb-4">
                  Thanks for shopping with us.
                </p>
                <h3 className="font-bold mb-3">Terms & Conditions</h3>
                <p className="text-sm text-gray-600">
                  Full payment is due upon receipt of this invoice. Late
                  payments may incur additional charges or interest as per the
                  applicable laws.
                </p>
              </div>
              <div className="p-8">
                <div className="ml-auto w-64">
                  <div className="flex justify-between py-2">
                    <span className="font-medium">Sub Total</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-blue-100">
                    <span className="font-medium">Tax Rate</span>
                    <span>{taxRate.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between py-2 border-t border-gray-200">
                    <span className="font-bold">Total</span>
                    <span className="font-bold">${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-blue-100">
                    <span className="font-medium">Balance Due</span>
                    <span className="font-medium">
                      ${invoice.remaining_amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
