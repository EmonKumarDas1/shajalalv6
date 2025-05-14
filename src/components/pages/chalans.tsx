import { DashboardLayout } from "../dashboard/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { ChalanTable } from "../chalan/ChalanTable";
import { ChalanForm } from "../chalan/ChalanForm";
import { EditChalanForm } from "../chalan/EditChalanForm";
import { Outlet, Route, Routes, useLocation } from "react-router-dom";
import { ChalanInvoice } from "../chalan/ChalanInvoice";

export default function Chalans() {
  const [isAddChalanOpen, setIsAddChalanOpen] = useState(false);
  const [isEditChalanOpen, setIsEditChalanOpen] = useState(false);
  const [selectedChalanId, setSelectedChalanId] = useState<string>("");
  const location = useLocation();
  const isDetailPage =
    location.pathname.includes("/dashboard/chalans/") &&
    !location.pathname.endsWith("/chalans");

  const handleChalanSuccess = () => {
    setIsAddChalanOpen(false);
    setIsEditChalanOpen(false);
  };

  const handleEditChalan = (chalanId: string) => {
    setSelectedChalanId(chalanId);
    setIsEditChalanOpen(true);
  };

  if (isDetailPage) {
    return <Outlet />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Chalans</h1>
            <p className="text-gray-500">
              Manage delivery slips and generate invoices
            </p>
          </div>
          <Button
            onClick={() => setIsAddChalanOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Chalan
          </Button>
        </div>

        <ChalanTable onEdit={handleEditChalan} />

        {/* Add Chalan Dialog */}
        <Dialog open={isAddChalanOpen} onOpenChange={setIsAddChalanOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Add New Chalan</DialogTitle>
            </DialogHeader>
            <ChalanForm
              onSuccess={handleChalanSuccess}
              onCancel={() => setIsAddChalanOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Chalan Dialog */}
        <Dialog open={isEditChalanOpen} onOpenChange={setIsEditChalanOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Edit Chalan</DialogTitle>
            </DialogHeader>
            {selectedChalanId && (
              <EditChalanForm
                chalanId={selectedChalanId}
                onSuccess={handleChalanSuccess}
                onCancel={() => setIsEditChalanOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

export function ChalanDetail() {
  const location = useLocation();
  const chalanId = location.pathname.split("/").pop() || "";
  const isDownloadPage = location.pathname.includes("/download");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {isDownloadPage ? (
          <ChalanInvoice
            chalanId={chalanId.replace("/download", "")}
            isDownloadMode={true}
          />
        ) : (
          <ChalanInvoice chalanId={chalanId} />
        )}
      </div>
    </DashboardLayout>
  );
}
