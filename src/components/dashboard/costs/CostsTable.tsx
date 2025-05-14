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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Plus, Search, Filter } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { OthersCost } from "@/types/schema";
import { CostForm } from "./CostForm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CostsTable() {
  const [costs, setCosts] = useState<OthersCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentCost, setCurrentCost] = useState<OthersCost | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchCosts();

    const subscription = supabase
      .channel("others_costs_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "others_costs" },
        () => {
          fetchCosts();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  async function fetchCosts() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("others_costs")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;
      setCosts(data || []);

      // Extract unique categories
      const uniqueCategories = [
        ...new Set(
          data?.filter((cost) => cost.category).map((cost) => cost.category) ||
            [],
        ),
      ];
      setCategories(uniqueCategories as string[]);
    } catch (error) {
      console.error("Error fetching costs:", error);
      toast({
        variant: "destructive",
        title: "Error fetching costs",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  async function deleteCost() {
    if (!currentCost) return;

    try {
      const { error } = await supabase
        .from("others_costs")
        .delete()
        .eq("id", currentCost.id);

      if (error) throw error;

      toast({
        title: "Cost deleted",
        description: "The cost has been deleted successfully",
      });

      setCurrentCost(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting cost:", error);
      toast({
        variant: "destructive",
        title: "Error deleting cost",
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function handleEditClick(cost: OthersCost) {
    setCurrentCost(cost);
    setIsEditDialogOpen(true);
  }

  function handleDeleteClick(cost: OthersCost) {
    setCurrentCost(cost);
    setIsDeleteDialogOpen(true);
  }

  const getCategoryColor = (category: string | null) => {
    if (!category) return "border-gray-200 bg-gray-50 text-gray-600";

    const categoryColors = {
      "Office Supplies": "border-blue-200 bg-blue-50 text-blue-600",
      Utilities: "border-green-200 bg-green-50 text-green-600",
      Rent: "border-purple-200 bg-purple-50 text-purple-600",
      Maintenance: "border-yellow-200 bg-yellow-50 text-yellow-600",
      Transportation: "border-orange-200 bg-orange-50 text-orange-600",
      Marketing: "border-pink-200 bg-pink-50 text-pink-600",
      Miscellaneous: "border-gray-200 bg-gray-50 text-gray-600",
    };

    return (
      categoryColors[category as keyof typeof categoryColors] ||
      "border-gray-200 bg-gray-50 text-gray-600"
    );
  };

  const filteredCosts = costs.filter((cost) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      cost.description.toLowerCase().includes(searchLower) ||
      (cost.category?.toLowerCase() || "").includes(searchLower) ||
      (cost.payment_method?.toLowerCase() || "").includes(searchLower) ||
      (cost.reference_number?.toLowerCase() || "").includes(searchLower);

    const matchesCategory =
      categoryFilter === "all" || cost.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const totalAmount = filteredCosts.reduce(
    (sum, cost) => sum + Number(cost.amount),
    0,
  );

  return (
    <div className="space-y-4 bg-white p-6 rounded-lg shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Search costs..."
              className="w-full bg-white pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Add Cost
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Add New Cost</DialogTitle>
              <DialogDescription>
                Enter the details for the new cost.
              </DialogDescription>
            </DialogHeader>
            <CostForm
              onSuccess={() => {
                setIsAddDialogOpen(false);
                fetchCosts();
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
      ) : filteredCosts.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          {searchQuery || categoryFilter
            ? "No costs match your search criteria."
            : "No costs found. Add your first cost to get started."}
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCosts.map((cost) => (
                  <TableRow key={cost.id}>
                    <TableCell className="font-medium">
                      {cost.description}
                    </TableCell>
                    <TableCell>
                      {cost.category ? (
                        <Badge
                          variant="outline"
                          className={getCategoryColor(cost.category)}
                        >
                          {cost.category}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${Number(cost.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {new Date(cost.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{cost.payment_method || "-"}</TableCell>
                    <TableCell>{cost.reference_number || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(cost)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(cost)}
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

          <div className="flex justify-end mt-4">
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="text-lg font-semibold flex gap-2">
                <span>Total:</span>
                <span className="text-blue-600">${totalAmount.toFixed(2)}</span>
              </div>
              <div className="text-sm text-gray-500">
                {filteredCosts.length} item{filteredCosts.length !== 1 && "s"}
                {categoryFilter && ` in ${categoryFilter}`}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Cost Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Cost</DialogTitle>
            <DialogDescription>Update the cost details.</DialogDescription>
          </DialogHeader>
          {currentCost && (
            <CostForm
              cost={currentCost}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                setCurrentCost(null);
                fetchCosts();
              }}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setCurrentCost(null);
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
              Are you sure you want to delete this cost? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteCost}
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
