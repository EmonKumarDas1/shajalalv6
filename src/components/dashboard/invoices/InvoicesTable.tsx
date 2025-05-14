import { useState, useEffect } from "react";
import { supabase } from "../../../../supabase/supabase";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Eye, Download, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Link, useLocation } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type Invoice = {
  id: string;
  invoice_number: string;
  created_at: string;
  total_amount: number;
  advance_payment: number;
  remaining_amount: number;
  status: "paid" | "partially_paid" | "unpaid";
  supplier_id: string;
  shop_id: string;
  supplier_name?: string;
  shop_name?: string;
  invoice_type?: "sales" | "product_addition" | string;
};

export function InvoicesTable() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<
    "all" | "sales" | "product_addition"
  >("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "paid" | "partially_paid" | "unpaid" | "pending"
  >("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<{
    id: string;
    number: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Check for URL parameters
    const urlParams = new URLSearchParams(location.search);
    const filterParam = urlParams.get("filter");
    const statusParam = urlParams.get("status");
    const supplierParam = urlParams.get("supplier");

    if (filterParam) {
      setInvoiceTypeFilter(filterParam as "all" | "sales" | "product_addition");
    }

    if (statusParam) {
      const statuses = statusParam.split(",");
      if (statuses.includes("unpaid") && statuses.includes("partially_paid")) {
        setStatusFilter("pending");
      }
    }

    if (supplierParam) {
      setSupplierFilter(supplierParam);
    }

    fetchSuppliers();
    fetchInvoices();

    const subscription = supabase
      .channel("invoices_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invoices" },
        () => {
          fetchInvoices();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [location.search]);

  async function fetchSuppliers() {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      toast({
        variant: "destructive",
        title: "Error fetching suppliers",
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function fetchInvoices() {
    try {
      setLoading(true);
      // First, fetch all invoices
      let query = supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });

      // Apply invoice type filter if not 'all'
      if (invoiceTypeFilter !== "all") {
        query = query.eq("invoice_type", invoiceTypeFilter);
      }

      // Apply status filter if not 'all'
      if (statusFilter === "pending") {
        query = query.in("status", ["partially_paid", "unpaid"]);
      } else if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Apply supplier filter if not 'all'
      if (supplierFilter !== "all") {
        query = query.eq("supplier_id", supplierFilter);
      }

      const { data: invoicesData, error: invoicesError } = await query;

      if (invoicesError) throw invoicesError;

      // Get unique supplier and shop IDs
      const supplierIds =
        invoicesData
          ?.filter((invoice) => invoice.supplier_id)
          .map((invoice) => invoice.supplier_id) || [];

      const shopIds =
        invoicesData
          ?.filter((invoice) => invoice.shop_id)
          .map((invoice) => invoice.shop_id) || [];

      const uniqueSupplierIds = [...new Set(supplierIds)];
      const uniqueShopIds = [...new Set(shopIds)];

      // Fetch supplier data if there are supplier IDs
      let supplierMap = {};
      if (uniqueSupplierIds.length > 0) {
        const { data: suppliersData, error: suppliersError } = await supabase
          .from("suppliers")
          .select("id, name")
          .in("id", uniqueSupplierIds);

        if (suppliersError) throw suppliersError;

        // Create a map of supplier id to supplier name
        supplierMap = (suppliersData || []).reduce((map, supplier) => {
          map[supplier.id] = supplier.name;
          return map;
        }, {});
      }

      // Fetch shop data if there are shop IDs
      let shopMap = {};
      if (uniqueShopIds.length > 0) {
        const { data: shopsData, error: shopsError } = await supabase
          .from("shops")
          .select("id, name")
          .in("id", uniqueShopIds);

        if (shopsError) throw shopsError;

        // Create a map of shop id to shop name
        shopMap = (shopsData || []).reduce((map, shop) => {
          map[shop.id] = shop.name;
          return map;
        }, {});
      }

      // Combine invoice data with supplier and shop data
      const formattedInvoices = (invoicesData || []).map((invoice) => ({
        ...invoice,
        supplier_name: invoice.supplier_id
          ? supplierMap[invoice.supplier_id]
          : null,
        shop_name: invoice.shop_id ? shopMap[invoice.shop_id] : null,
      }));

      setInvoices(formattedInvoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "border-green-200 bg-green-50 text-green-600";
      case "partially_paid":
        return "border-yellow-200 bg-yellow-50 text-yellow-600";
      case "unpaid":
        return "border-red-200 bg-red-50 text-red-600";
      default:
        return "";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "paid":
        return "Paid";
      case "partially_paid":
        return "Partially Paid";
      case "unpaid":
        return "Unpaid";
      default:
        return status;
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      invoice.invoice_number.toLowerCase().includes(searchLower) ||
      (invoice.supplier_name?.toLowerCase() || "").includes(searchLower) ||
      (invoice.shop_name?.toLowerCase() || "").includes(searchLower)
    );
  });

  const handleDeleteInvoice = (id: string, invoiceNumber: string) => {
    setInvoiceToDelete({ id, number: invoiceNumber });
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return;

    try {
      setIsDeleting(true);

      // First delete related invoice items
      const { error: itemsError } = await supabase
        .from("invoice_items")
        .delete()
        .eq("invoice_id", invoiceToDelete.id);

      if (itemsError) throw itemsError;

      // Then delete related payments
      const { error: paymentsError } = await supabase
        .from("payments")
        .delete()
        .eq("invoice_id", invoiceToDelete.id);

      if (paymentsError) throw paymentsError;

      // Finally delete the invoice itself
      const { error: invoiceError } = await supabase
        .from("invoices")
        .delete()
        .eq("id", invoiceToDelete.id);

      if (invoiceError) throw invoiceError;

      // Update the local state to remove the deleted invoice
      setInvoices(
        invoices.filter((invoice) => invoice.id !== invoiceToDelete.id),
      );

      toast({
        title: "Invoice deleted",
        description: `Invoice #${invoiceToDelete.number} has been successfully deleted.`,
      });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast({
        variant: "destructive",
        title: "Error deleting invoice",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Search invoices..."
              className="w-full bg-white pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={invoiceTypeFilter}
              onValueChange={(value) =>
                setInvoiceTypeFilter(
                  value as "all" | "sales" | "product_addition",
                )
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="product_addition">Purchases</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(
                  value as
                    | "all"
                    | "paid"
                    | "partially_paid"
                    | "unpaid"
                    | "pending",
                )
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partially_paid">Partially Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="pending">Pending Payment</SelectItem>
              </SelectContent>
            </Select>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            {searchQuery
              ? "No invoices match your search."
              : "No invoices found. Add products with payment details to generate invoices."}
          </div>
        ) : (
          <div className="rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Advance Payment</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{invoice.supplier_name || "N/A"}</TableCell>
                    <TableCell>{invoice.shop_name || "N/A"}</TableCell>
                    <TableCell>${invoice.total_amount.toFixed(2)}</TableCell>
                    <TableCell>${invoice.advance_payment.toFixed(2)}</TableCell>
                    <TableCell>
                      ${invoice.remaining_amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getStatusColor(invoice.status)}
                      >
                        {getStatusLabel(invoice.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/dashboard/invoices/${invoice.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link
                            to={`/dashboard/invoices/${invoice.id}/download`}
                          >
                            <Download className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            handleDeleteInvoice(
                              invoice.id,
                              invoice.invoice_number,
                            );
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

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
              {invoiceToDelete?.number}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteInvoice();
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
