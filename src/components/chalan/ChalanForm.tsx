import { useState } from "react";
import { supabase } from "../../../supabase/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Trash2, Plus, FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";

type ChalanItem = {
  id: string;
  name: string;
  quantity: number;
  watt: string;
  color: string;
  model: string;
  size: string;
  price?: number;
};

interface ChalanFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function ChalanForm({ onSuccess, onCancel }: ChalanFormProps) {
  const [companyName, setCompanyName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [chalanItems, setChalanItems] = useState<ChalanItem[]>([]);
  const [notes, setNotes] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [newProductQuantity, setNewProductQuantity] = useState<number>(1);
  const [newProductWatt, setNewProductWatt] = useState("");
  const [newProductColor, setNewProductColor] = useState("");
  const [newProductModel, setNewProductModel] = useState("");
  const [newProductSize, setNewProductSize] = useState("");
  const [newProductPrice, setNewProductPrice] = useState<string>("");
  const navigate = useNavigate();

  const addItemToChalan = () => {
    if (!newProductName.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Product name is required",
      });
      return;
    }

    if (newProductQuantity < 1) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Quantity must be at least 1",
      });
      return;
    }

    const price = newProductPrice ? parseFloat(newProductPrice) : undefined;
    if (price !== undefined && price < 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Price cannot be negative",
      });
      return;
    }

    setChalanItems([
      ...chalanItems,
      {
        id: Date.now().toString(),
        name: newProductName.trim(),
        quantity: newProductQuantity,
        watt: newProductWatt.trim(),
        color: newProductColor.trim(),
        model: newProductModel.trim(),
        size: newProductSize.trim(),
        price,
      },
    ]);

    toast({
      title: "Product added",
      description: `${newProductName.trim()} added to chalan`,
    });

    setNewProductName("");
    setNewProductQuantity(1);
    setNewProductWatt("");
    setNewProductColor("");
    setNewProductModel("");
    setNewProductSize("");
    setNewProductPrice("");
  };

  const removeItem = (id: string) => {
    setChalanItems(chalanItems.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) quantity = 1;

    setChalanItems(
      chalanItems.map((item) =>
        item.id === id ? { ...item, quantity } : item,
      ),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyName.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter a company name",
      });
      return;
    }

    if (chalanItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please add at least one product to the chalan",
      });
      return;
    }

    try {
      setLoading(true);

      const chalanNumber = `CHLN-${Date.now().toString().slice(-6)}`;

      const { data: chalanData, error: chalanError } = await supabase
        .from("chalans")
        .insert({
          chalan_number: chalanNumber,
          company_name: companyName.trim(),
          status: "pending",
          notes: notes || null,
          created_at: new Date().toISOString(),
        })
        .select();

      if (chalanError) throw chalanError;

      const chalanId = chalanData[0].id;

      const chalanItemsData = chalanItems.map((item) => ({
        chalan_id: chalanId,
        product_name: item.name,
        quantity: item.quantity,
        watt: item.watt || null,
        color: item.color || null,
        model: item.model || null,
        size: item.size || null,
        price: item.price ?? null,
        created_at: new Date().toISOString(),
      }));

      const { error: itemsError } = await supabase
        .from("chalan_items")
        .insert(chalanItemsData);

      if (itemsError) throw itemsError;

      toast({
        title: "Chalan created",
        description: `Chalan #${chalanNumber} has been created successfully`,
      });

      navigate(`/dashboard/chalans/${chalanId}`);
      onSuccess();
    } catch (error) {
      console.error("Error creating chalan:", error);
      toast({
        variant: "destructive",
        title: "Error creating chalan",
        description:
          error instanceof Error ? error.message : JSON.stringify(error),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sticky top-0 bg-white z-10 py-4">
        <div className="space-y-2">
          <Label htmlFor="company-name">Company Name *</Label>
          <Input
            id="company-name"
            placeholder="Enter company name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Add any additional information here"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[80px]"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Add Product</h3>
        <div className="space-y-4">
          {/* First Row */}
          <div className="flex gap-4 items-end flex-wrap">
            <div className="space-y-2 min-w-[200px]">
              <Label htmlFor="product-name">Product Name *</Label>
              <Input
                id="product-name"
                placeholder="Enter product name"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
              />
            </div>
            <div className="space-y-2 min-w-[120px]">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={newProductQuantity}
                onChange={(e) =>
                  setNewProductQuantity(parseInt(e.target.value) || 1)
                }
              />
            </div>
            <div className="space-y-2 min-w-[120px]">
              <Label htmlFor="watt">Watt</Label>
              <Input
                id="watt"
                placeholder="Enter watt"
                value={newProductWatt}
                onChange={(e) => setNewProductWatt(e.target.value)}
              />
            </div>
          </div>
          {/* Second Row */}
          <div className="flex gap-4 items-end flex-wrap">
            <div className="space-y-2 min-w-[120px]">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                placeholder="Enter color"
                value={newProductColor}
                onChange={(e) => setNewProductColor(e.target.value)}
              />
            </div>
            <div className="space-y-2 min-w-[120px]">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                placeholder="Enter model"
                value={newProductModel}
                onChange={(e) => setNewProductModel(e.target.value)}
              />
            </div>
            <div className="space-y-2 min-w-[120px]">
              <Label htmlFor="size">Size</Label>
              <Input
                id="size"
                placeholder="Enter size"
                value={newProductSize}
                onChange={(e) => setNewProductSize(e.target.value)}
              />
            </div>
            <div className="space-y-2 min-w-[120px]">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter price"
                value={newProductPrice}
                onChange={(e) => setNewProductPrice(e.target.value)}
              />
            </div>
            <Button
              type="button"
              onClick={addItemToChalan}
              className="flex items-center gap-1 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Chalan Items</h3>
        {chalanItems.length === 0 ? (
          <div className="text-center py-8 border rounded-md text-gray-500">
            No items added to chalan yet
          </div>
        ) : (
          <div className="border rounded-md overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Watt</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="w-[150px]">Quantity</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chalanItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.watt || "-"}</TableCell>
                    <TableCell>{item.color || "-"}</TableCell>
                    <TableCell>{item.model || "-"}</TableCell>
                    <TableCell>{item.size || "-"}</TableCell>
                    <TableCell>
                      {item.price !== undefined ? item.price.toFixed(2) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          disabled={item.quantity <= 1}
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(
                              item.id,
                              parseInt(e.target.value) || 1,
                            )
                          }
                          className="w-16 text-center"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                        >
                          +
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
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

      <div className="flex justify-end gap-3 pt-6 sticky bottom-0 bg-white z-10 py-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading || chalanItems.length === 0}>
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              Saving...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Save Chalan
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}
