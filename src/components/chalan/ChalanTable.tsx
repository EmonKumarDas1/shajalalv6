import { useState, useEffect } from "react";
import { supabase } from "../../../supabase/supabase";
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
import { Eye, Download, Search, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";
import { format } from "date-fns";
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

type Chalan = {
  id: string;
  chalan_number: string;
  created_at: string;
  company_name: string;
  status: "pending" | "delivered" | "cancelled";
  notes?: string;
};

interface ChalanTableProps {
  onEdit?: (chalanId: string) => void;
}

export function ChalanTable({ onEdit }: ChalanTableProps) {
  const [chalans, setChalans] = useState<Chalan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chalanToDelete, setChalanToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchChalans();

    const subscription = supabase
      .channel("chalans_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chalans" },
        () => {
          fetchChalans();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  async function fetchChalans() {
    try {
      setLoading(true);
      const { data: chalansData, error: chalansError } = await supabase
        .from("chalans")
        .select("*")
        .order("created_at", { ascending: false });

      if (chalansError) throw chalansError;

      setChalans(chalansData || []);
    } catch (error) {
      console.error("Error fetching chalans:", error);
      toast({
        variant: "destructive",
        title: "Error fetching chalans",
        description:
          error instanceof Error ? error.message : JSON.stringify(error),
      });
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteClick = (chalanId: string) => {
    setChalanToDelete(chalanId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!chalanToDelete) return;

    try {
      setDeleting(true);

      // First delete chalan items
      const { error: itemsError } = await supabase
        .from("chalan_items")
        .delete()
        .eq("chalan_id", chalanToDelete);

      if (itemsError) throw itemsError;

      // Then delete the chalan
      const { error: chalanError } = await supabase
        .from("chalans")
        .delete()
        .eq("id", chalanToDelete);

      if (chalanError) throw chalanError;

      toast({
        title: "Success",
        description: "Chalan deleted successfully",
      });

      // Refresh the list
      fetchChalans();
    } catch (error) {
      console.error("Error deleting chalan:", error);
      toast({
        variant: "destructive",
        title: "Error deleting chalan",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setChalanToDelete(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "border-green-200 bg-green-50 text-green-600";
      case "pending":
        return "border-yellow-200 bg-yellow-50 text-yellow-600";
      case "cancelled":
        return "border-red-200 bg-red-50 text-red-600";
      default:
        return "";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "delivered":
        return "Delivered";
      case "pending":
        return "Pending";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  const filteredChalans = chalans.filter((chalan) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      chalan.chalan_number.toLowerCase().includes(searchLower) ||
      (chalan.company_name?.toLowerCase() || "").includes(searchLower)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search chalans..."
            className="w-full bg-white pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredChalans.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          {searchQuery
            ? "No chalans match your search."
            : "No chalans found. Create a new chalan to get started."}
        </div>
      ) : (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chalan #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredChalans.map((chalan) => (
                <TableRow key={chalan.id}>
                  <TableCell className="font-medium">
                    {chalan.chalan_number}
                  </TableCell>
                  <TableCell>
                    {format(new Date(chalan.created_at), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>{chalan.company_name || "N/A"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getStatusColor(chalan.status)}
                    >
                      {getStatusLabel(chalan.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/dashboard/chalans/${chalan.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/dashboard/chalans/${chalan.id}/download`}>
                          <Download className="h-4 w-4" />
                        </Link>
                      </Button>
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(chalan.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(chalan.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              chalan and all its items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Deleting...
                </span>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
