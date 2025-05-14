import { useState, useEffect } from "react";
import { supabase } from "../../../../supabase/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, ArrowUpDown, Filter, X } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Product } from "@/types/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ProductSearchProps {
  onAddToCart: (product: Product) => void;
  shopId: string;
}

type SortOption = {
  field: string;
  label: string;
  column: string;
};

const sortOptions: SortOption[] = [
  { field: "name", label: "Product Name", column: "name" },
  { field: "supplier", label: "Supplier", column: "supplier_id" },
  { field: "watt", label: "Wattage", column: "watt" },
];

export function ProductSearch({ onAddToCart, shopId }: ProductSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<string>("name");
  const [productSuppliers, setProductSuppliers] = useState<
    Record<string, string>
  >({});
  const [showFilters, setShowFilters] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);

  // Filter states
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [shopFilter, setShopFilter] = useState<string>(shopId || "all");
  const [wattFilter, setWattFilter] = useState<string>("");
  const [sizeFilter, setSizeFilter] = useState<string>("");
  const [colorFilter, setColorFilter] = useState<string>("");
  const [modelFilter, setModelFilter] = useState<string>("");

  useEffect(() => {
    if (shopId) {
      fetchProducts();
      fetchSuppliers();
      fetchShops();
    }
  }, [shopId, sortBy]);

  // Auto-search when query changes
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const debounceTimer = setTimeout(() => {
        handleSearch();
      }, 300);

      return () => clearTimeout(debounceTimer);
    }
  }, [searchQuery]);

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase.from("suppliers").select("*");
      if (error) throw error;
      setSuppliers(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching suppliers",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchShops = async () => {
    try {
      const { data, error } = await supabase.from("shops").select("*");
      if (error) throw error;
      setShops(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching shops",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Helper function to apply filters to a query
  const applyFilters = (query: any) => {
    if (supplierFilter !== "all") {
      query = query.eq("supplier_id", supplierFilter);
    }

    if (shopFilter !== "all") {
      query = query.eq("shop_id", shopFilter);
    }

    if (wattFilter) {
      query = query.eq("watt", wattFilter);
    }

    if (sizeFilter) {
      query = query.eq("size", sizeFilter);
    }

    if (colorFilter) {
      query = query.eq("color", colorFilter);
    }

    if (modelFilter) {
      query = query.eq("model", modelFilter);
    }

    return query;
  };

  // Helper function to fetch supplier names
  const fetchSupplierNames = async (data: any[]) => {
    const supplierIds =
      data?.map((product) => product.supplier_id).filter(Boolean) || [];
    const uniqueSupplierIds = [...new Set(supplierIds)];

    const suppliersMap: Record<string, string> = {};

    if (uniqueSupplierIds.length > 0) {
      const { data: suppliersData, error: suppliersError } = await supabase
        .from("suppliers")
        .select("id, name")
        .in("id", uniqueSupplierIds);

      if (!suppliersError && suppliersData) {
        suppliersData.forEach((supplier) => {
          suppliersMap[supplier.id] = supplier.name;
        });
      }
    }

    return suppliersMap;
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("products")
        .select("*")
        .order(sortBy, { ascending: true });

      // Apply filters
      query = applyFilters(query);

      const { data, error } = await query;

      if (error) throw error;

      // Get supplier names
      const suppliersMap = await fetchSupplierNames(data || []);

      setProductSuppliers(suppliersMap);
      setProducts(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching products",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("products")
        .select("*")
        .order(sortBy, { ascending: true });

      // Apply search query if it exists
      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      // Apply filters
      query = applyFilters(query);

      const { data, error } = await query;

      if (error) throw error;

      // Get supplier names
      const suppliersMap = await fetchSupplierNames(data || []);

      setProductSuppliers(suppliersMap);
      setProducts(data || []);
    } catch (error: any) {
      toast({
        title: "Error searching products",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSupplierFilter("all");
    setShopFilter(shopId || "all");
    setWattFilter("");
    setSizeFilter("");
    setColorFilter("");
    setModelFilter("");
    fetchProducts();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => {
              const currentSortOption = sortOptions.find(
                (option) => option.field === sortBy,
              );
              const nextIndex =
                (sortOptions.findIndex((option) => option.field === sortBy) +
                  1) %
                sortOptions.length;
              setSortBy(sortOptions[nextIndex].field);
            }}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span>
              {sortOptions.find((option) => option.field === sortBy)?.label ||
                "Sort"}
            </span>
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 gap-4 rounded-md border p-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="supplier-filter">Supplier</Label>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger id="supplier-filter">
                  <SelectValue placeholder="Select supplier" />
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

            <div className="space-y-2">
              <Label htmlFor="shop-filter">Shop</Label>
              <Select value={shopFilter} onValueChange={setShopFilter}>
                <SelectTrigger id="shop-filter">
                  <SelectValue placeholder="Select shop" />
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

            <div className="space-y-2">
              <Label htmlFor="watt-filter">Wattage</Label>
              <Input
                id="watt-filter"
                value={wattFilter}
                onChange={(e) => setWattFilter(e.target.value)}
                placeholder="Filter by wattage"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="size-filter">Size</Label>
              <Input
                id="size-filter"
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value)}
                placeholder="Filter by size"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color-filter">Color</Label>
              <Input
                id="color-filter"
                value={colorFilter}
                onChange={(e) => setColorFilter(e.target.value)}
                placeholder="Filter by color"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model-filter">Model</Label>
              <Input
                id="model-filter"
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                placeholder="Filter by model"
              />
            </div>

            <div className="flex items-end space-x-2">
              <Button
                variant="outline"
                onClick={resetFilters}
                className="flex items-center gap-1"
              >
                <X className="h-4 w-4" /> Reset Filters
              </Button>
              <Button onClick={fetchProducts}>Apply</Button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <p>Loading products...</p>
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <h3 className="font-medium">{product.name}</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onAddToCart(product)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>
                      Supplier:{" "}
                      {productSuppliers[product.supplier_id] || "Unknown"}
                    </p>
                    <p>
                      Price: ৳{product.selling_price?.toLocaleString() || "N/A"}
                    </p>
                    <p>Stock: {product.quantity || 0}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {product.watt && (
                        <Badge variant="outline">{product.watt}W</Badge>
                      )}
                      {product.size && (
                        <Badge variant="outline">{product.size}</Badge>
                      )}
                      {product.color && (
                        <Badge variant="outline">{product.color}</Badge>
                      )}
                      {product.model && (
                        <Badge variant="outline">{product.model}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-md border">
          <p className="text-muted-foreground">
            {searchQuery
              ? "No products found matching your search."
              : "No products found. Try adjusting your filters."}
          </p>
        </div>
      )}
    </div>
  );
}
