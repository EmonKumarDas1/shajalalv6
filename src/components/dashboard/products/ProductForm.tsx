import { useState, useEffect } from "react";
import { supabase } from "../../../../supabase/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Product, Supplier, Shop } from "@/types/schema";
import {
  RefreshCw,
  Calendar,
  Percent,
  Tag,
  Search,
  Palette,
  Ruler,
  Smartphone,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface ProductFormProps {
  product?: Product;
  isRestocking?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProductForm({
  product,
  isRestocking = false,
  onSuccess,
  onCancel,
}: ProductFormProps) {
  const [name, setName] = useState(product?.name || "");
  const [buyingPrice, setBuyingPrice] = useState<string>(
    product?.buying_price?.toString() || "",
  );
  const [sellingPrice, setSellingPrice] = useState<string>(
    product?.selling_price?.toString() || "",
  );
  const [quantity, setQuantity] = useState<string>(
    product?.quantity?.toString() || "0",
  );
  const [barcode, setBarcode] = useState(product?.barcode || "");
  const [supplierId, setSupplierId] = useState<string>(
    product?.supplier_id || "",
  );
  const [shopId, setShopId] = useState<string>(product?.shop_id || "");
  const [watt, setWatt] = useState<string>(product?.watt?.toString() || "");
  const [size, setSize] = useState<string>(product?.size || "");
  const [color, setColor] = useState<string>(product?.color || "");
  const [model, setModel] = useState<string>(product?.model || "");
  const [advancePayment, setAdvancePayment] = useState<string>(
    product?.advance_payment?.toString() || "0",
  );
  const [remainingAmount, setRemainingAmount] = useState<string>(
    product?.remaining_amount?.toString() || "0",
  );
  const [discount, setDiscount] = useState<string>("0");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<string>(
    product?.created_at
      ? new Date(product.created_at).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
  );
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchSuppliers();
    fetchShops();
  }, []);

  useEffect(() => {
    if (searchQuery && searchQuery.trim().length >= 2) {
      searchProducts(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // Calculate remaining amount when selling price or advance payment changes
  useEffect(() => {
    const selling = Number(sellingPrice) || 0;
    const advance = Number(advancePayment) || 0;
    setRemainingAmount(Math.max(0, selling - advance).toString());
  }, [sellingPrice, advancePayment]);

  // If editing a product, we don't need to calculate selling price
  useEffect(() => {
    if (!product && discount && buyingPrice) {
      const buying = Number(buyingPrice) || 0;
      const markupValue = Number(discount) || 0;
      if (markupValue > 0) {
        const markupAmount = (buying * markupValue) / 100;
        const newSellingPrice = buying + markupAmount;
        setSellingPrice(newSellingPrice.toFixed(2));
      }
    }
  }, [buyingPrice, discount, product]);

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

  async function searchProducts(query: string) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*, suppliers(name)")
        .ilike("name", `%${query}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
      console.log("Search results:", data);
    } catch (error) {
      console.error("Error searching products:", error);
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

  async function checkExistingProduct() {
    if (!name.trim() || !supplierId) return null;

    try {
      // Case insensitive search for product with same name, supplier, and watt
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .ilike("name", name.trim())
        .eq("supplier_id", supplierId);

      if (error) throw error;

      // Find exact match with case insensitive name and matching watt
      const matchingProduct = data?.find((p) => {
        const productWatt = watt ? Number(watt) : null;
        return (
          p.name.toLowerCase() === name.trim().toLowerCase() &&
          p.watt === productWatt &&
          (!product || p.id !== product.id)
        ); // Exclude current product when editing
      });

      return matchingProduct || null;
    } catch (error) {
      console.error("Error checking existing product:", error);
      return null;
    }
  }

  const handleSelectProduct = (selectedProduct: Product) => {
    setName(selectedProduct.name || "");
    setBuyingPrice(selectedProduct.buying_price?.toString() || "");
    setSellingPrice(selectedProduct.selling_price?.toString() || "");
    setBarcode(selectedProduct.barcode || "");
    setSupplierId(selectedProduct.supplier_id || "");
    setShopId(selectedProduct.shop_id || "");
    setWatt(selectedProduct.watt?.toString() || "");
    setSize(selectedProduct.size || "");
    setColor(selectedProduct.color || "");
    setModel(selectedProduct.model || "");

    // Set advance payment and remaining amount if available
    if (
      selectedProduct.advance_payment !== undefined &&
      selectedProduct.advance_payment !== null
    ) {
      setAdvancePayment(selectedProduct.advance_payment.toString());
    }
    if (
      selectedProduct.remaining_amount !== undefined &&
      selectedProduct.remaining_amount !== null
    ) {
      setRemainingAmount(selectedProduct.remaining_amount.toString());
    }

    // Close the search popover and reset the search query
    setIsSearchOpen(false);
    setSearchQuery("");

    toast({
      title: "Product selected",
      description: `${selectedProduct.name} has been loaded into the form.`,
    });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Product name is required",
      });
      return;
    }

    if (
      !buyingPrice ||
      isNaN(Number(buyingPrice)) ||
      Number(buyingPrice) <= 0
    ) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Buying price must be a positive number",
      });
      return;
    }

    if (
      !sellingPrice ||
      isNaN(Number(sellingPrice)) ||
      Number(sellingPrice) <= 0
    ) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Selling price must be a positive number",
      });
      return;
    }

    if (!quantity || isNaN(Number(quantity)) || Number(quantity) < 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Quantity must be a non-negative number",
      });
      return;
    }

    if (!supplierId) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Supplier is required",
      });
      return;
    }

    if (!shopId) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Shop is required",
      });
      return;
    }

    if (
      advancePayment &&
      (isNaN(Number(advancePayment)) || Number(advancePayment) < 0)
    ) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Advance payment must be a non-negative number",
      });
      return;
    }

    if (watt && (isNaN(Number(watt)) || Number(watt) <= 0)) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Watt must be a positive number",
      });
      return;
    }

    try {
      setLoading(true);

      // Check for existing product with same name, supplier, and watt (case insensitive)
      const existingProduct = await checkExistingProduct();

      const productData = product
        ? {
            name: name.trim(),
            buying_price: Number(buyingPrice),
            supplier_id: supplierId,
            shop_id: shopId,
            watt: watt ? Number(watt) : null,
            size: size.trim() || null,
            color: color.trim() || null,
            model: model.trim() || null,
            updated_at: new Date().toISOString(),
          }
        : {
            name: name.trim(),
            buying_price: Number(buyingPrice),
            selling_price: Number(sellingPrice),
            quantity: Number(quantity),
            barcode: barcode.trim() || null,
            supplier_id: supplierId,
            shop_id: shopId,
            watt: watt ? Number(watt) : null,
            size: size.trim() || null,
            color: color.trim() || null,
            model: model.trim() || null,
            advance_payment: Number(advancePayment),
            remaining_amount: Number(remainingAmount),
            created_at: date
              ? new Date(date).toISOString()
              : new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

      let result;
      let productId;

      if (product) {
        // Update existing product
        result = await supabase
          .from("products")
          .update(productData)
          .eq("id", product.id)
          .select();

        productId = product.id;

        // Add entry to product_history for the update
        await supabase.from("product_history").insert({
          product_id: product.id,
          quantity: Number(quantity),
          action_type: isRestocking ? "restock" : "update",
          notes: isRestocking ? "Product restocked" : "Product updated",
          created_at: new Date().toISOString(),
        });
      } else if (existingProduct) {
        // Update existing product if found with same name, supplier, and watt
        const updatedQuantity = existingProduct.quantity + Number(quantity);
        result = await supabase
          .from("products")
          .update({
            ...productData,
            quantity: updatedQuantity,
          })
          .eq("id", existingProduct.id)
          .select();

        productId = existingProduct.id;

        // Add entry to product_history for the quantity update
        await supabase.from("product_history").insert({
          product_id: existingProduct.id,
          quantity: Number(quantity), // Record the added quantity, not the total
          action_type: "restock",
          notes: `Added ${quantity} units to existing product`,
          created_at: new Date().toISOString(),
        });

        toast({
          title: "Product updated",
          description: `Found existing product "${existingProduct.name}". Updated quantity to ${updatedQuantity}.`,
        });
      } else {
        // Create new product
        result = await supabase.from("products").insert([productData]).select();

        if (result.data && result.data.length > 0) {
          productId = result.data[0].id;

          // Add entry to product_history for the new product
          await supabase.from("product_history").insert({
            product_id: productId,
            quantity: Number(quantity),
            action_type: "create",
            notes: "Initial product creation",
            created_at: date
              ? new Date(date).toISOString()
              : new Date().toISOString(),
          });
        }
      }

      if (result.error) throw result.error;

      if (!existingProduct) {
        toast({
          title: product ? "Product updated" : "Product created",
          description: product
            ? "The product has been updated successfully"
            : "The product has been created successfully",
        });
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving product:", error);
      toast({
        variant: "destructive",
        title: `Error ${product ? "updating" : "creating"} product`,
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 max-w-full overflow-x-auto"
    >
      {isRestocking && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
          <h3 className="text-blue-800 font-medium flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Restocking Mode
          </h3>
          <p className="text-blue-600 text-sm mt-1">
            This product is low on stock. Update the quantity to restock it.
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Product Name *</Label>
          <div className="relative">
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter product name"
              required
              className="pr-10"
            />
            <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 text-gray-400 hover:text-gray-600 bg-transparent"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsSearchOpen(true);
                  }}
                >
                  <Search className="h-4 w-4 text-gray-600" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                side="bottom"
                sideOffset={5}
                alignOffset={-10}
                className="w-[300px] p-0"
              >
                <Command>
                  <CommandInput
                    placeholder="Search products..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandList>
                    <CommandEmpty>No products found</CommandEmpty>
                    <CommandGroup heading="Products">
                      {searchResults.map((product) => (
                        <CommandItem
                          key={product.id}
                          value={product.id}
                          onSelect={() => handleSelectProduct(product)}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{product.name}</span>
                            <span className="text-xs text-gray-500">
                              {product.watt && `${product.watt}W • `}
                              {product.barcode && `${product.barcode}`}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-xs text-gray-500">
            Click the search icon to find existing products
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="date" className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Date *
          </Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="supplier">Supplier *</Label>
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a supplier" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="shop">Shop *</Label>
          <Select value={shopId} onValueChange={setShopId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a shop" />
            </SelectTrigger>
            <SelectContent>
              {shops.map((shop) => (
                <SelectItem key={shop.id} value={shop.id}>
                  {shop.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {shops.length === 0 && (
            <p className="text-xs text-red-500 mt-1">
              No shops available. Please add a shop first.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="buyingPrice">Buying Price *</Label>
          <Input
            id="buyingPrice"
            type="number"
            step="0.01"
            min="0"
            value={buyingPrice}
            onChange={(e) => setBuyingPrice(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>

        {!product && (
          <div className="space-y-2">
            <Label
              htmlFor="quantity"
              className={isRestocking ? "text-blue-700 font-medium" : ""}
            >
              Quantity *
            </Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              required
              className={
                isRestocking
                  ? "border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                  : ""
              }
            />
            {isRestocking && (
              <p className="text-xs text-blue-600 mt-1">
                Current stock: {product?.quantity || 0} units
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="watt" className="flex items-center gap-1">
            <Ruler className="h-4 w-4" />
            Watt
          </Label>
          <Input
            id="watt"
            type="number"
            min="0"
            value={watt}
            onChange={(e) => setWatt(e.target.value)}
            placeholder="Enter watt"
          />
        </div>

        {!product && (
          <div className="space-y-2">
            <Label htmlFor="barcode">Barcode</Label>
            <Input
              id="barcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Enter barcode"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="size" className="flex items-center gap-1">
            <Ruler className="h-4 w-4" />
            Size
          </Label>
          <Input
            id="size"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="Enter size (e.g., Small, Medium, Large)"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="color" className="flex items-center gap-1">
            <Palette className="h-4 w-4" />
            Color
          </Label>
          <Input
            id="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="Enter color"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="model" className="flex items-center gap-1">
            <Smartphone className="h-4 w-4" />
            Model
          </Label>
          <Input
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Enter model number"
          />
        </div>

        {!product && (
          <>
            <div className="space-y-2">
              <Label htmlFor="advancePayment">Advance Payment</Label>
              <Input
                id="advancePayment"
                type="number"
                step="0.01"
                min="0"
                max={sellingPrice}
                value={advancePayment}
                onChange={(e) => setAdvancePayment(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="remainingAmount">Remaining Amount</Label>
              <Input
                id="remainingAmount"
                type="number"
                value={remainingAmount}
                readOnly
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">
                Automatically calculated (Selling Price - Advance Payment)
              </p>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className={`w-full sm:w-auto ${isRestocking ? "bg-blue-600 hover:bg-blue-700" : ""}`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              {isRestocking
                ? "Restocking..."
                : product
                  ? "Updating..."
                  : "Creating..."}
            </span>
          ) : (
            <>
              {isRestocking
                ? "Restock Product"
                : product
                  ? "Update Product"
                  : "Create Product"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
