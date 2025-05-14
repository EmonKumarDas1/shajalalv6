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
import { Eye, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ReturnsTable() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    fetchReturns();

    const subscription = supabase
      .channel("returns_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_returns" },
        () => fetchReturns(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [statusFilter]);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("product_returns")
        .select(
          `
          *,
          customers:customer_id (id, name),
          return_items!return_id (id, quantity, unit_price, total_price, condition, product_id, products:product_id (name)),
          invoice:invoice_id (id, invoice_number)
        `,
        )
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReturns(data || []);
    } catch (error) {
      console.error("Error fetching returns:", error);
      toast({
        variant: "destructive",
        title: "Error fetching returns",
        description: error.message || "Failed to fetch returns",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "border-yellow-200 bg-yellow-50 text-yellow-600",
      approved: "border-green-200 bg-green-50 text-green-600",
      rejected: "border-red-200 bg-red-50 text-red-600",
      completed: "border-blue-200 bg-blue-50 text-blue-600",
    };
    return colors[status] || "border-gray-200 bg-gray-50 text-gray-600";
  };

  const getReturnTypeColor = (type) => {
    const colors = {
      refund: "border-purple-200 bg-purple-50 text-purple-600",
      exchange: "border-indigo-200 bg-indigo-50 text-indigo-600",
    };
    return colors[type] || "border-gray-200 bg-gray-50 text-gray-600";
  };

  const handleViewDetails = (returnData) => {
    setSelectedReturn(returnData);
    setIsDetailsOpen(true);
  };

  const handleUpdateStatus = async (returnId, newStatus) => {
    try {
      const { error } = await supabase
        .from("product_returns")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", returnId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Return status has been updated to ${newStatus}`,
      });

      fetchReturns();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        variant: "destructive",
        title: "Error updating status",
        description: error.message || "Failed to update status",
      });
    }
  };

  const filteredReturns = returns.filter((r) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      r.return_reason?.toLowerCase().includes(searchLower) ||
      r.customers?.name?.toLowerCase().includes(searchLower) ||
      r.invoice_id?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Search returns..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredReturns.length === 0 ? (
        <div className="text-center py-10 text-gray-500">No returns found.</div>
      ) : (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Return ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReturns.map((returnData) => (
                <TableRow key={returnData.id}>
                  <TableCell className="font-medium">
                    {returnData.id.substring(0, 8)}
                  </TableCell>
                  <TableCell>{returnData.customers?.name || "N/A"}</TableCell>
                  <TableCell>
                    {returnData.return_date
                      ? format(new Date(returnData.return_date), "MMM dd, yyyy")
                      : format(new Date(returnData.created_at), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>{returnData.return_items?.length || 0}</TableCell>
                  <TableCell>${returnData.total_amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getReturnTypeColor(returnData.return_type)}
                    >
                      {returnData.return_type === "refund"
                        ? "Refund"
                        : "Exchange"}
                    </Badge>
                  </TableCell>
                  <TableCell>{returnData.return_reason}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getStatusColor(returnData.status)}
                    >
                      {returnData.status.charAt(0).toUpperCase() +
                        returnData.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewDetails(returnData)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Return Details</DialogTitle>
          </DialogHeader>
          {selectedReturn && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium">Customer Information</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedReturn.customers?.name || "N/A"}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">Return Status</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className={getStatusColor(selectedReturn.status)}
                    >
                      {selectedReturn.status.charAt(0).toUpperCase() +
                        selectedReturn.status.slice(1)}
                    </Badge>
                    {selectedReturn.status === "pending" && (
                      <Select
                        value={selectedReturn.status}
                        onValueChange={(value) =>
                          handleUpdateStatus(selectedReturn.id, value)
                        }
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Update status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="approved">Approve</SelectItem>
                          <SelectItem value="rejected">Reject</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {selectedReturn.status === "approved" && (
                      <Button
                        variant="outline"
                        className="bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
                        onClick={() =>
                          handleUpdateStatus(selectedReturn.id, "completed")
                        }
                      >
                        Mark as Completed
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <h3 className="font-medium">Return Type</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className={getReturnTypeColor(selectedReturn.return_type)}
                    >
                      {selectedReturn.return_type === "refund"
                        ? "Refund"
                        : "Exchange"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium">Product Condition</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedReturn.condition
                      ? selectedReturn.condition.charAt(0).toUpperCase() +
                        selectedReturn.condition.slice(1)
                      : "Not specified"}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Returned Items</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Condition</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedReturn.return_items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.products?.name || "N/A"}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>${item.unit_price.toFixed(2)}</TableCell>
                          <TableCell>${item.total_price.toFixed(2)}</TableCell>
                          <TableCell>{item.condition}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium">Return Reason</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedReturn.return_reason}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">Notes</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedReturn.notes || "No notes provided"}
                  </p>
                </div>
              </div>

              {selectedReturn.return_type === "exchange" &&
                selectedReturn.exchange_product_id && (
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">Exchange Details</h3>
                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="font-medium">
                              Exchange Product:
                            </span>
                            <span>
                              {selectedReturn.exchange_product?.name ||
                                "Product not found"}
                            </span>
                          </div>
                          {selectedReturn.price_difference !== 0 && (
                            <div className="flex justify-between">
                              <span className="font-medium">
                                {selectedReturn.price_difference > 0
                                  ? "Additional Payment:"
                                  : "Store Credit:"}
                              </span>
                              <span
                                className={
                                  selectedReturn.price_difference > 0
                                    ? "text-red-600"
                                    : "text-green-600"
                                }
                              >
                                $
                                {Math.abs(
                                  selectedReturn.price_difference,
                                ).toFixed(2)}
                              </span>
                            </div>
                          )}
                          {selectedReturn.return_fees > 0 && (
                            <div className="flex justify-between">
                              <span className="font-medium">Return Fees:</span>
                              <span className="text-red-600">
                                ${selectedReturn.return_fees.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

              <div className="flex justify-between items-center pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-500">
                    Created on{" "}
                    {selectedReturn.created_at
                      ? format(
                          new Date(selectedReturn.created_at),
                          "MMM dd, yyyy HH:mm",
                        )
                      : "Unknown date"}
                  </p>
                  {selectedReturn.admin_notes && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Admin Notes:</p>
                      <p className="text-sm text-gray-600">
                        {selectedReturn.admin_notes}
                      </p>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  {selectedReturn.return_type === "refund" ? (
                    <>
                      <p className="font-medium">Total Refund Amount</p>
                      <p className="text-2xl font-bold text-green-600">
                        ${selectedReturn.refund_amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Via{" "}
                        {selectedReturn.payment_method === "original"
                          ? "Original Payment Method"
                          : selectedReturn.payment_method === "store_credit"
                            ? "Store Credit"
                            : "Cash"}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">Exchange Transaction</p>
                      <p className="text-xl font-bold">
                        {selectedReturn.price_difference > 0 ? (
                          <span className="text-red-600">
                            Additional Payment: $
                            {selectedReturn.price_difference.toFixed(2)}
                          </span>
                        ) : selectedReturn.price_difference < 0 ? (
                          <span className="text-green-600">
                            Store Credit: $
                            {Math.abs(selectedReturn.price_difference).toFixed(
                              2,
                            )}
                          </span>
                        ) : (
                          <span className="text-blue-600">Even Exchange</span>
                        )}
                      </p>
                    </>
                  )}
                  {selectedReturn.status === "approved" && (
                    <Button
                      className="mt-2 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() =>
                        handleUpdateStatus(selectedReturn.id, "completed")
                      }
                    >
                      {selectedReturn.return_type === "refund"
                        ? "Process Refund"
                        : "Complete Exchange"}{" "}
                      & Finalize
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
