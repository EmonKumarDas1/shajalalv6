import { useState, useEffect } from "react";
import { supabase } from "../../../supabase/supabase";
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
import { Trash2, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type ChalanItem = {
  id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  temp_id?: string; // For new items that don't have an ID yet
};

type Product = {
  id: string;
  name: string;
  quantity: number;
};

type Shop = {
  id: string;
  name: string;
};

interface EditChalanFormProps {
  chalanId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EditChalanForm({
  chalanId,
  onSuccess,
  onCancel,
}: EditChalanFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [chalanNumber, setChalanNumber] = useState("");
  const [shopId, setShopId] = useState("");
  const [status, setStatus] = useState<"pending" | "delivered" | "cancelled">(
    "pending",
  );
  const [notes, setNotes] = useState("");
  const [chalanItems, setChalanItems] = useState<ChalanItem[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  useEffect(() => {
    fetchShops();
    fetchProducts();
    fetchChalanDetails();
  }, [chalanId]);

  async function fetchShops() {
    try {
      const { data, error } = await supabase
        .from("shops")
        .select("id, name")
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
      const { data, error } = await supabase
        .from("products")
        .select("id, name, quantity")
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        variant: "destructive",
        title: "Error fetching products",
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function fetchChalanDetails() {
    try {
      setLoading(true);

      // Fetch chalan details
      const { data: chalanData, error: chalanError } = await supabase
        .from("chalans")
        .select("*")
        .eq("id", chalanId)
        .single();

      if (chalanError) throw chalanError;

      setChalanNumber(chalanData.chalan_number);
      setShopId(chalanData.shop_id || "");
      setStatus(chalanData.status || "pending");
      setNotes(chalanData.notes || "");

      // Fetch chalan items
      const { data: itemsData, error: itemsError } = await supabase
        .from("chalan_items")
        .select("*")
        .eq("chalan_id", chalanId);

      if (itemsError) throw itemsError;

      setChalanItems(itemsData || []);
    } catch (error) {
      console.error("Error fetching chalan details:", error);
      toast({
        variant: "destructive",
        title: "Error fetching chalan details",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  const handleAddProduct = () => {
    if (!selectedProductId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a product",
      });
      return;
    }

    if (selectedQuantity <= 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Quantity must be greater than 0",
      });
      return;
    }

    const selectedProduct = products.find((p) => p.id === selectedProductId);
    if (!selectedProduct) return;

    // Check if product already exists in the list
    const existingItemIndex = chalanItems.findIndex(
      (item) => item.product_id === selectedProductId,
    );

    if (existingItemIndex >= 0) {
      // Update quantity if product already exists
      const updatedItems = [...chalanItems];
      updatedItems[existingItemIndex].quantity += selectedQuantity;
      setChalanItems(updatedItems);
    } else {
      // Add new product
      const newItem: ChalanItem = {
        product_id: selectedProductId,
        product_name: selectedProduct.name,
        quantity: selectedQuantity,
        temp_id: Date.now().toString(), // Temporary ID for new items
      };

      setChalanItems([...chalanItems, newItem]);
    }

    // Reset selection
    setSelectedProductId("");
    setSelectedQuantity(1);
  };

  const handleRemoveProduct = (index: number) => {
    const updatedItems = [...chalanItems];
    updatedItems.splice(index, 1);
    setChalanItems(updatedItems);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    if (quantity <= 0) return;

    const updatedItems = [...chalanItems];
    updatedItems[index].quantity = quantity;
    setChalanItems(updatedItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!chalanNumber) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter a chalan number",
      });
      return;
    }

    if (!shopId) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a shop",
      });
      return;
    }

    if (chalanItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please add at least one product",
      });
      return;
    }

    try {
      setSaving(true);

      // Update chalan details
      const { error: updateChalanError } = await supabase
        .from("chalans")
        .update({
          chalan_number: chalanNumber,
          shop_id: shopId,
          status: status,
          notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", chalanId);

      if (updateChalanError) throw updateChalanError;

      // Get existing items to determine which ones to delete
      const { data: existingItems, error: fetchError } = await supabase
        .from("chalan_items")
        .select("id")
        .eq("chalan_id", chalanId);

      if (fetchError) throw fetchError;

      // Find items to delete (items in DB but not in current list)
      const existingIds = existingItems.map((item) => item.id);
      const currentIds = chalanItems
        .filter((item) => item.id)
        .map((item) => item.id);

      const idsToDelete = existingIds.filter((id) => !currentIds.includes(id));

      // Delete removed items
      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from("chalan_items")
          .delete()
          .in("id", idsToDelete);

        if (deleteError) throw deleteError;
      }

      // Update existing items and add new ones
      for (const item of chalanItems) {
        if (item.id) {
          // Update existing item
          const { error: updateItemError } = await supabase
            .from("chalan_items")
            .update({
              product_id: item.product_id,
              product_name: item.product_name,
              quantity: item.quantity,
            })
            .eq("id", item.id);

          if (updateItemError) throw updateItemError;
        } else {
          // Add new item
          const { error: insertItemError } = await supabase
            .from("chalan_items")
            .insert({
              chalan_id: chalanId,
              product_id: item.product_id,
              product_name: item.product_name,
              quantity: item.quantity,
              created_at: new Date().toISOString(),
            });

          if (insertItemError) throw insertItemError;
        }
      }

      toast({
        title: "Success",
        description: "Chalan updated successfully",
      });

      onSuccess();
    } catch (error) {
      console.error("Error updating chalan:", error);
      toast({
        variant: "destructive",
        title: "Error updating chalan",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="chalanNumber">Chalan Number *</Label>
            <Input
              id="chalanNumber"
              value={chalanNumber}
              onChange={(e) => setChalanNumber(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="shop">Shop *</Label>
            <Select value={shopId} onValueChange={setShopId}>
              <SelectTrigger id="shop">
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
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={status}
              onValueChange={(value: "pending" | "delivered" | "cancelled") =>
                setStatus(value)
              }
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 border rounded-md">
            <h3 className="font-medium mb-3">Add Products</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="product">Product</Label>
                <Select
                  value={selectedProductId}
                  onValueChange={setSelectedProductId}
                >
                  <SelectTrigger id="product">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} (Available: {product.quantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={selectedQuantity}
                  onChange={(e) =>
                    setSelectedQuantity(parseInt(e.target.value) || 1)
                  }
                />
              </div>

              <Button
                type="button"
                onClick={handleAddProduct}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Product
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium">Products</h3>

        {chalanItems.length === 0 ? (
          <div className="text-center py-8 border rounded-md text-gray-500">
            No products added yet. Add products using the form above.
          </div>
        ) : (
          <div className="border rounded-md overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chalanItems.map((item, index) => (
                  <TableRow key={item.id || item.temp_id}>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleQuantityChange(
                            index,
                            parseInt(e.target.value) || 1,
                          )
                        }
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveProduct(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              Saving...
            </span>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  );
}
