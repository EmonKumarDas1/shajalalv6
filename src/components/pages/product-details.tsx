import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../supabase/supabase";
import { DashboardLayout } from "../dashboard/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  Edit,
  Package,
  Calendar,
  Tag,
  Store,
  History,
  Clock,
} from "lucide-react";
import { ProductHistory } from "@/types/schema";

interface ProductHistoryWithDetails extends ProductHistory {
  action_description?: string;
}

interface ProductWithDetails {
  id: string;
  name: string;
  buying_price: number;
  selling_price: number;
  quantity: number;
  barcode: string | null;
  supplier_id: string;
  shop_id: string;
  watt: number | null;
  size: string | null;
  color: string | null;
  model: string | null;
  advance_payment: number;
  remaining_amount: number;
  created_at: string;
  updated_at: string;
  supplier_name: string;
  shop_name: string;
}

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductWithDetails | null>(null);
  const [productHistory, setProductHistory] = useState<
    ProductHistoryWithDetails[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchProductDetails();
      fetchProductHistory();
    }
  }, [id]);

  async function fetchProductDetails() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        // Fetch supplier name
        const { data: supplierData, error: supplierError } = await supabase
          .from("suppliers")
          .select("name")
          .eq("id", data.supplier_id)
          .single();

        if (supplierError) throw supplierError;

        // Fetch shop name
        const { data: shopData, error: shopError } = await supabase
          .from("shops")
          .select("name")
          .eq("id", data.shop_id)
          .single();

        if (shopError) throw shopError;

        setProduct({
          ...data,
          supplier_name: supplierData?.name || "Unknown",
          shop_name: shopData?.name || "Unknown",
        });
      }
    } catch (error) {
      console.error("Error fetching product details:", error);
      toast({
        variant: "destructive",
        title: "Error fetching product details",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchProductHistory() {
    try {
      // First, check if the product_history table exists
      const { error: tableCheckError } = await supabase
        .from("product_history")
        .select("id")
        .limit(1);

      if (tableCheckError) {
        console.log(
          "Product history table might not exist yet:",
          tableCheckError,
        );
        // If the table doesn't exist, use the product's creation date as the initial history entry
        const { data, error } = await supabase
          .from("products")
          .select("id, quantity, created_at, updated_at")
          .eq("id", id)
          .single();

        if (error) throw error;

        if (data) {
          // Create a history entry from the product's data
          const historyEntry: ProductHistoryWithDetails = {
            id: data.id,
            product_id: data.id,
            quantity: data.quantity,
            action_type: "initial",
            notes: "Initial product creation",
            created_at: data.created_at,
            updated_at: data.updated_at,
            action_description: "Product Created",
          };

          setProductHistory([historyEntry]);
        }
        return;
      }

      // If the table exists, fetch the actual history
      const { data: historyData, error: historyError } = await supabase
        .from("product_history")
        .select("*")
        .eq("product_id", id)
        .order("created_at", { ascending: false });

      if (historyError) throw historyError;

      if (historyData && historyData.length > 0) {
        // Process the history data to add descriptive text
        const processedHistory = historyData.map((entry) => {
          let actionDescription = "";
          switch (entry.action_type) {
            case "create":
              actionDescription = "Product Created";
              break;
            case "update":
              actionDescription = "Quantity Updated";
              break;
            case "restock":
              actionDescription = "Product Restocked";
              break;
            case "sale":
              actionDescription = "Product Sold";
              break;
            case "return":
              actionDescription = "Product Returned";
              break;
            default:
              actionDescription =
                entry.action_type.charAt(0).toUpperCase() +
                entry.action_type.slice(1);
          }

          return {
            ...entry,
            action_description: actionDescription,
          };
        });

        setProductHistory(processedHistory);
      } else {
        // If no history entries found, create an initial entry from the product data
        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("id, quantity, created_at, updated_at")
          .eq("id", id)
          .single();

        if (productError) throw productError;

        if (productData) {
          // Create a history entry from the product's data
          const historyEntry: ProductHistoryWithDetails = {
            id: productData.id,
            product_id: productData.id,
            quantity: productData.quantity,
            action_type: "initial",
            notes: "Initial product creation",
            created_at: productData.created_at,
            updated_at: productData.updated_at,
            action_description: "Product Created",
          };

          // Also create an entry in the product_history table for future reference
          const { error: insertError } = await supabase
            .from("product_history")
            .insert({
              product_id: productData.id,
              quantity: productData.quantity,
              action_type: "create",
              notes: "Initial product creation",
              created_at: productData.created_at,
            });

          if (insertError) {
            console.error("Error creating initial history entry:", insertError);
          }

          setProductHistory([historyEntry]);
        }
      }
    } catch (error) {
      console.error("Error fetching product history:", error);
      toast({
        variant: "destructive",
        title: "Error fetching product history",
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const getStockStatus = (quantity: number) => {
    if (quantity <= 0) return { status: "out-of-stock", label: "Out of Stock" };
    if (quantity <= 5) return { status: "low-stock", label: "Low Stock" };
    return { status: "in-stock", label: "In Stock" };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in-stock":
        return "border-green-200 bg-green-50 text-green-600";
      case "low-stock":
        return "border-yellow-200 bg-yellow-50 text-yellow-600";
      case "out-of-stock":
        return "border-red-200 bg-red-50 text-red-600";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!product) {
    return (
      <DashboardLayout>
        <div className="text-center py-10">
          <h2 className="text-2xl font-bold">Product Not Found</h2>
          <p className="text-gray-500 mt-2">
            The requested product could not be found.
          </p>
          <Button
            onClick={() => navigate("/dashboard/products")}
            className="mt-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const { status, label } = getStockStatus(product.quantity);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {product.name}
            </h1>
            <p className="text-gray-500">Product Details</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard/products")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button
              onClick={() => navigate(`/dashboard/products/edit/${product.id}`)}
            >
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">
                    Product Name
                  </p>
                  <p className="font-medium">{product.name}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <Badge variant="outline" className={getStatusColor(status)}>
                    {label}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Supplier</p>
                  <p>{product.supplier_name}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Shop</p>
                  <p>{product.shop_name}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">
                    Buying Price
                  </p>
                  <p>${product.buying_price.toFixed(2)}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">
                    Selling Price
                  </p>
                  <p>${product.selling_price.toFixed(2)}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">
                    Current Quantity
                  </p>
                  <p>{product.quantity}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Barcode</p>
                  <p>{product.barcode || "N/A"}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Watt</p>
                  <p>{product.watt ? `${product.watt}W` : "N/A"}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Size</p>
                  <p>{product.size || "N/A"}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Color</p>
                  <p>{product.color || "N/A"}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Model</p>
                  <p>{product.model || "N/A"}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">
                    Advance Payment
                  </p>
                  <p>${product.advance_payment.toFixed(2)}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">
                    Remaining Amount
                  </p>
                  <p>${product.remaining_amount.toFixed(2)}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">
                    Added Date
                  </p>
                  <p>
                    {format(new Date(product.created_at), "MMM dd, yyyy HH:mm")}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">
                    Last Updated
                  </p>
                  <p>{format(new Date(product.updated_at), "MMM dd, yyyy")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-md">
                  <Package className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Current Stock</p>
                    <p className="text-2xl font-bold">{product.quantity}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-md">
                  <Tag className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Selling Price</p>
                    <p className="text-2xl font-bold">
                      ${product.selling_price.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-md">
                  <Store className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium">Shop</p>
                    <p className="text-lg font-medium">{product.shop_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-md">
                  <Calendar className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium">Added On</p>
                    <p className="text-lg font-medium">
                      {format(new Date(product.created_at), "MMM dd, yyyy")}
                    </p>
                    <p className="text-xs text-amber-700">
                      {format(new Date(product.created_at), "HH:mm:ss")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-600" />
              Product History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {productHistory.length === 0 ? (
              <p className="text-center py-4 text-gray-500">
                No history available for this product.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productHistory.map((history) => (
                    <TableRow key={history.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {format(
                              new Date(history.created_at),
                              "MMM dd, yyyy",
                            )}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(history.created_at), "HH:mm:ss")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`
                            ${history.action_type === "create" || history.action_type === "initial" ? "border-green-200 bg-green-50 text-green-600" : ""}
                            ${history.action_type === "update" ? "border-blue-200 bg-blue-50 text-blue-600" : ""}
                            ${history.action_type === "restock" ? "border-purple-200 bg-purple-50 text-purple-600" : ""}
                            ${history.action_type === "sale" ? "border-amber-200 bg-amber-50 text-amber-600" : ""}
                            ${history.action_type === "return" ? "border-orange-200 bg-orange-50 text-orange-600" : ""}
                          `}
                        >
                          {history.action_description || history.action_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{history.quantity}</TableCell>
                      <TableCell>{history.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
