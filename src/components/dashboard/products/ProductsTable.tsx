import { useState, useEffect } from "react";
import { supabase } from "../../../../supabase/supabase";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Badge } from "@/components/ui/badge";
import {
  Edit,
  Trash2,
  Plus,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Product, Supplier } from "@/types/schema";
import { ProductForm } from "./ProductForm";
import { BatchProductForm } from "./BatchProductForm";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";

type ProductWithSupplier = Product & {
  suppliers: Pick<Supplier, "name">;
  shop_name?: string;
};

export function ProductsTable() {
  const [products, setProducts] = useState<ProductWithSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRestockDialogOpen, setIsRestockDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [wattFilter, setWattFilter] = useState<string>("");
  const [shopFilter, setShopFilter] = useState<string>("all");
  const [buyingPriceFilter, setBuyingPriceFilter] = useState<string>("");
  const [sizeFilter, setSizeFilter] = useState<string>("");
  const [colorFilter, setColorFilter] = useState<string>("");
  const [modelFilter, setModelFilter] = useState<string>("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
    fetchSuppliers();
    fetchShops();

    const subscription = supabase
      .channel("products_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          fetchProducts();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  async function fetchSuppliers() {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
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

  async function fetchShops() {
    try {
      const { data, error } = await supabase
        .from("shops")
        .select("*")
        .order("name");

      if (error) throw error;
      setShops(data || []);
    } catch (error) {
      console.error("Error fetching shops:", error);
      toast({
        variant: "destructive",
        title: "Error fetching shops",
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function fetchProducts() {
    try {
      setLoading(true);
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*, shops(id, name)")
        .order("created_at", { ascending: false });

      if (productsError) throw productsError;

      const supplierIds =
        productsData
          ?.filter((product) => product.supplier_id)
          .map((product) => product.supplier_id) || [];

      const uniqueSupplierIds = [...new Set(supplierIds)];

      let supplierMap = {};
      if (uniqueSupplierIds.length > 0) {
        const { data: suppliersData, error: suppliersError } = await supabase
          .from("suppliers")
          .select("id, name")
          .in("id", uniqueSupplierIds);

        if (suppliersError) throw suppliersError;

        supplierMap = (suppliersData || []).reduce((map, supplier) => {
          map[supplier.id] = { name: supplier.name };
          return map;
        }, {});
      }

      const productsWithSuppliers = (productsData || []).map((product) => {
        return {
          ...product,
          suppliers: product.supplier_id
            ? supplierMap[product.supplier_id]
            : null,
          shop_name: product.shops?.name || "N/A",
        };
      });

      setProducts(productsWithSuppliers);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        variant: "destructive",
        title: "Error fetching products",
        description:
          error instanceof Error ? error.message : JSON.stringify(error),
      });
    } finally {
      setLoading(false);
    }
  }

  async function deleteProduct() {
    if (!currentProduct) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", currentProduct.id);

      if (error) throw error;

      toast({
        title: "Product deleted",
        description: "The product has been deleted successfully",
      });

      setCurrentProduct(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        variant: "destructive",
        title: "Error deleting product",
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function handleEditClick(product: Product) {
    setCurrentProduct(product);
    setIsEditDialogOpen(true);
  }

  function handleDeleteClick(product: Product) {
    setCurrentProduct(product);
    setIsDeleteDialogOpen(true);
  }

  function handleRestockClick(product: Product) {
    setCurrentProduct(product);
    setIsRestockDialogOpen(true);
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

  const filteredProducts = products.filter((product) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      product.name.toLowerCase().includes(searchLower) ||
      product.suppliers?.name?.toLowerCase().includes(searchLower) ||
      (product.barcode?.toLowerCase() || "").includes(searchLower);

    const matchesSupplier =
      supplierFilter === "all" || product.supplier_id === supplierFilter;

    const matchesWatt =
      !wattFilter ||
      (product.watt !== null &&
        product.watt !== undefined &&
        product.watt.toString().includes(wattFilter));

    const matchesShop = shopFilter === "all" || product.shop_id === shopFilter;

    const matchesBuyingPrice =
      !buyingPriceFilter ||
      (product.buying_price !== null &&
        product.buying_price !== undefined &&
        product.buying_price.toString().includes(buyingPriceFilter));

    const matchesSize =
      !sizeFilter ||
      (product.size !== null &&
        product.size !== undefined &&
        product.size.toLowerCase().includes(sizeFilter.toLowerCase()));

    const matchesColor =
      !colorFilter ||
      (product.color !== null &&
        product.color !== undefined &&
        product.color.toLowerCase().includes(colorFilter.toLowerCase()));

    const matchesModel =
      !modelFilter ||
      (product.model !== null &&
        product.model !== undefined &&
        product.model.toLowerCase().includes(modelFilter.toLowerCase()));

    if (showLowStockOnly) {
      return (
        matchesSearch &&
        matchesSupplier &&
        matchesWatt &&
        matchesShop &&
        matchesBuyingPrice &&
        matchesSize &&
        matchesColor &&
        matchesModel &&
        Number(product.quantity) <= 5
      );
    }

    return (
      matchesSearch &&
      matchesSupplier &&
      matchesWatt &&
      matchesShop &&
      matchesBuyingPrice &&
      matchesSize &&
      matchesColor &&
      matchesModel
    );
  });

  // Pagination calculations
  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Search products..."
              className="w-full bg-white pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            variant={showLowStockOnly ? "default" : "outline"}
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className="whitespace-nowrap"
          >
            {showLowStockOnly ? "Show All" : "Show Low Stock Only"}
          </Button>
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="whitespace-nowrap"
          >
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>
        </div>
        <Button onClick={() => navigate("/dashboard/products/add")}>
          <Plus className="mr-2 h-4 w-4" /> Add Products
        </Button>
      </div>

      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg border mb-4">
          <h3 className="text-sm font-medium mb-3">Filter Products</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="supplierFilter" className="mb-1 block">
                Supplier
              </Label>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Suppliers" />
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

            <div>
              <Label htmlFor="wattFilter" className="mb-1 block">
                Watt
              </Label>
              <Input
                id="wattFilter"
                placeholder="Filter by watt"
                value={wattFilter}
                onChange={(e) => setWattFilter(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="buyingPriceFilter" className="mb-1 block">
                Buying Price
              </Label>
              <Input
                id="buyingPriceFilter"
                placeholder="Filter by buying price"
                value={buyingPriceFilter}
                onChange={(e) => setBuyingPriceFilter(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="sizeFilter" className="mb-1 block">
                Size
              </Label>
              <Input
                id="sizeFilter"
                placeholder="Filter by size"
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="colorFilter" className="mb-1 block">
                Color
              </Label>
              <Input
                id="colorFilter"
                placeholder="Filter by color"
                value={colorFilter}
                onChange={(e) => setColorFilter(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="modelFilter" className="mb-1 block">
                Model
              </Label>
              <Input
                id="modelFilter"
                placeholder="Filter by model"
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="shopFilter" className="mb-1 block">
                Shop
              </Label>
              <Select value={shopFilter} onValueChange={setShopFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Shops" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shops</SelectItem>
                  {shops.map((shop) => (
                    <SelectItem key={shop.id} value={shop.id}>
                      {shop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          {searchQuery
            ? "No products match your search: " + searchQuery
            : "No products found. Add your first product to get started."}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead>Watt</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Buying Price</TableHead>
                  <TableHead>Selling Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Added Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.map((product) => {
                  const { status, label } = getStockStatus(product.quantity);
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        {product.name}
                      </TableCell>
                      <TableCell>{product.suppliers?.name || "N/A"}</TableCell>
                      <TableCell>{product.shop_name}</TableCell>
                      <TableCell>{product.watt || "N/A"}</TableCell>
                      <TableCell>{product.size || "N/A"}</TableCell>
                      <TableCell>{product.color || "N/A"}</TableCell>
                      <TableCell>{product.model || "N/A"}</TableCell>
                      <TableCell>
                        ${Number(product.buying_price).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        ${Number(product.selling_price).toFixed(2)}
                      </TableCell>
                      <TableCell>{product.quantity}</TableCell>
                      <TableCell>
                        {format(new Date(product.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStatusColor(status)}
                        >
                          {label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {product.quantity <= 5 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRestockClick(product)}
                              title="Restock Product"
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              navigate(`/dashboard/products/${product.id}`)
                            }
                            title="View Product Details"
                          >
                            <Search className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(product)}
                            title="Edit Product"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(product)}
                            title="Delete Product"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="itemsPerPage">Items per page:</Label>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={handleItemsPerPageChange}
              >
                <SelectTrigger className="w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages} ({totalItems} items)
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update the product details.</DialogDescription>
          </DialogHeader>
          {currentProduct && (
            <ProductForm
              product={currentProduct}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                setCurrentProduct(null);
                fetchProducts();
              }}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setCurrentProduct(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Restock Product Dialog */}
      <Dialog open={isRestockDialogOpen} onOpenChange={setIsRestockDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Restock Product</DialogTitle>
            <DialogDescription>
              Update the quantity for this low stock product.
            </DialogDescription>
          </DialogHeader>
          {currentProduct && (
            <ProductForm
              product={currentProduct}
              isRestocking={true}
              onSuccess={() => {
                setIsRestockDialogOpen(false);
                setCurrentProduct(null);
                fetchProducts();
              }}
              onCancel={() => {
                setIsRestockDialogOpen(false);
                setCurrentProduct(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteProduct}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
