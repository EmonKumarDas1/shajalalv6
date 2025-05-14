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
import { Textarea } from "@/components/ui/textarea";
import { Eye, Edit, Trash2, Plus, Search, DollarSign } from "lucide-react";
import { Supplier } from "@/types/schema";
import { toast } from "@/components/ui/use-toast";
import { SupplierForm } from "./SupplierForm";
import { SupplierDetails } from "./SupplierDetails";

export function SuppliersTable() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<Supplier | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchSuppliers();

    const subscription = supabase
      .channel("suppliers_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "suppliers" },
        () => {
          fetchSuppliers();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  async function fetchSuppliers() {
    try {
      setLoading(true);

      // Check if suppliers table has the required fields
      const { data: tableInfo, error: tableError } = await supabase
        .from("suppliers")
        .select("contact, email, phone, address, notes")
        .limit(1);

      // If fields don't exist, they'll be null in the response but won't cause an error
      // We'll handle this gracefully

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
    } finally {
      setLoading(false);
    }
  }

  async function deleteSupplier() {
    if (!currentSupplier) return;

    try {
      // Check if supplier has products
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id")
        .eq("supplier_id", currentSupplier.id)
        .limit(1);

      if (productsError) throw productsError;

      if (products && products.length > 0) {
        toast({
          variant: "destructive",
          title: "Cannot delete supplier",
          description:
            "This supplier has products associated with it. Remove the products first.",
        });
        setIsDeleteDialogOpen(false);
        setCurrentSupplier(null);
        return;
      }

      const { error } = await supabase
        .from("suppliers")
        .delete()
        .eq("id", currentSupplier.id);

      if (error) throw error;

      toast({
        title: "Supplier deleted",
        description: "The supplier has been deleted successfully",
      });

      setCurrentSupplier(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting supplier:", error);
      toast({
        variant: "destructive",
        title: "Error deleting supplier",
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function handleEditClick(supplier: Supplier) {
    setCurrentSupplier(supplier);
    setIsEditDialogOpen(true);
  }

  function handleDeleteClick(supplier: Supplier) {
    setCurrentSupplier(supplier);
    setIsDeleteDialogOpen(true);
  }

  function handleViewDetails(supplier: Supplier) {
    setCurrentSupplier(supplier);
    setShowDetails(true);
  }

  const filteredSuppliers = suppliers.filter((supplier) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      supplier.name.toLowerCase().includes(searchLower) ||
      (supplier.contact?.toLowerCase() || "").includes(searchLower) ||
      (supplier.email?.toLowerCase() || "").includes(searchLower) ||
      (supplier.phone?.toLowerCase() || "").includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {showDetails && currentSupplier ? (
        <SupplierDetails
          supplier={currentSupplier}
          onBack={() => setShowDetails(false)}
          onSupplierUpdated={fetchSuppliers}
        />
      ) : (
        <div className="space-y-4 bg-white p-6 rounded-lg shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Search suppliers..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-1 w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  Add Supplier
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Add New Supplier</DialogTitle>
                  <DialogDescription>
                    Enter the details for the new supplier.
                  </DialogDescription>
                </DialogHeader>
                <SupplierForm
                  onSuccess={() => {
                    setIsAddDialogOpen(false);
                    fetchSuppliers();
                  }}
                  onCancel={() => setIsAddDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              {searchQuery
                ? "No suppliers match your search."
                : "No suppliers found. Add your first supplier to get started."}
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Contact
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Email/Phone
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Created At
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">
                        {supplier.name}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {supplier.contact || "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {supplier.email && (
                          <div className="text-sm">{supplier.email}</div>
                        )}
                        {supplier.phone && (
                          <div className="text-sm text-gray-500">
                            {supplier.phone}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {new Date(supplier.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(supplier)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(supplier)}
                            title="Edit Supplier"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(supplier)}
                            title="Delete Supplier"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Edit Supplier</DialogTitle>
                <DialogDescription>
                  Update the supplier details.
                </DialogDescription>
              </DialogHeader>
              {currentSupplier && (
                <SupplierForm
                  supplier={currentSupplier}
                  onSuccess={() => {
                    setIsEditDialogOpen(false);
                    setCurrentSupplier(null);
                    fetchSuppliers();
                  }}
                  onCancel={() => {
                    setIsEditDialogOpen(false);
                    setCurrentSupplier(null);
                  }}
                />
              )}
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this supplier? This action
                  cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={deleteSupplier}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
