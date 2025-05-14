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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Trash2, Plus } from "lucide-react";
import { Shop } from "@/types/schema";
import { toast } from "@/components/ui/use-toast";

export function ShopsTable() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentShop, setCurrentShop] = useState<Shop | null>(null);
  const [shopName, setShopName] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [shopPhone, setShopPhone] = useState("");

  useEffect(() => {
    fetchShops();

    const subscription = supabase
      .channel("shops_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shops" },
        () => {
          fetchShops();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  async function fetchShops() {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }

  async function addShop() {
    if (!shopName.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Shop name is required",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("shops")
        .insert([
          {
            name: shopName.trim(),
            address: shopAddress.trim() || null,
            phone: shopPhone.trim() || null,
          },
        ])
        .select();

      if (error) throw error;

      toast({
        title: "Shop added",
        description: "The shop has been added successfully",
      });

      setShopName("");
      setShopAddress("");
      setShopPhone("");
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error adding shop:", error);
      toast({
        variant: "destructive",
        title: "Error adding shop",
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function updateShop() {
    if (!currentShop || !shopName.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Shop name is required",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("shops")
        .update({
          name: shopName.trim(),
          address: shopAddress.trim() || null,
          phone: shopPhone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentShop.id);

      if (error) throw error;

      toast({
        title: "Shop updated",
        description: "The shop has been updated successfully",
      });

      setShopName("");
      setShopAddress("");
      setShopPhone("");
      setCurrentShop(null);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating shop:", error);
      toast({
        variant: "destructive",
        title: "Error updating shop",
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function deleteShop() {
    if (!currentShop) return;

    try {
      // Check if shop has products
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id")
        .eq("shop_id", currentShop.id)
        .limit(1);

      if (productsError) throw productsError;

      if (products && products.length > 0) {
        toast({
          variant: "destructive",
          title: "Cannot delete shop",
          description:
            "This shop has products associated with it. Remove the products first.",
        });
        setIsDeleteDialogOpen(false);
        setCurrentShop(null);
        return;
      }

      const { error } = await supabase
        .from("shops")
        .delete()
        .eq("id", currentShop.id);

      if (error) throw error;

      toast({
        title: "Shop deleted",
        description: "The shop has been deleted successfully",
      });

      setCurrentShop(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting shop:", error);
      toast({
        variant: "destructive",
        title: "Error deleting shop",
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function handleEditClick(shop: Shop) {
    setCurrentShop(shop);
    setShopName(shop.name);
    setShopAddress(shop.address || "");
    setShopPhone(shop.phone || "");
    setIsEditDialogOpen(true);
  }

  function handleDeleteClick(shop: Shop) {
    setCurrentShop(shop);
    setIsDeleteDialogOpen(true);
  }

  return (
    <div className="space-y-4 bg-white p-6 rounded-lg shadow-sm">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Shops</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Add Shop
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Shop</DialogTitle>
              <DialogDescription>
                Enter the details for the new shop.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="col-span-3"
                  placeholder="Shop name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">
                  Address
                </Label>
                <Input
                  id="address"
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  className="col-span-3"
                  placeholder="Shop address"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">
                  Phone
                </Label>
                <Input
                  id="phone"
                  value={shopPhone}
                  onChange={(e) => setShopPhone(e.target.value)}
                  className="col-span-3"
                  placeholder="Shop phone"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={addShop}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : shops.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          No shops found. Add your first shop to get started.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Updated At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shops.map((shop) => (
              <TableRow key={shop.id}>
                <TableCell className="font-medium">{shop.name}</TableCell>
                <TableCell>{shop.address || "-"}</TableCell>
                <TableCell>{shop.phone || "-"}</TableCell>
                <TableCell>
                  {shop.created_at
                    ? new Date(shop.created_at).toLocaleDateString()
                    : "-"}
                </TableCell>
                <TableCell>
                  {shop.updated_at
                    ? new Date(shop.updated_at).toLocaleDateString()
                    : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(shop)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(shop)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Shop</DialogTitle>
            <DialogDescription>Update the shop details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-address" className="text-right">
                Address
              </Label>
              <Input
                id="edit-address"
                value={shopAddress}
                onChange={(e) => setShopAddress(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-phone" className="text-right">
                Phone
              </Label>
              <Input
                id="edit-phone"
                value={shopPhone}
                onChange={(e) => setShopPhone(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={updateShop}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this shop? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteShop}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
