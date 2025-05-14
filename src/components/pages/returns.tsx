import { useState } from "react";
import { DashboardLayout } from "../dashboard/layout/DashboardLayout";
import { ReturnsTable } from "../dashboard/returns/ReturnsTable";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ReturnProcessPage } from "../dashboard/returns/ReturnProcessPage";

export default function Returns() {
  const [showProcessReturn, setShowProcessReturn] = useState(false);

  if (showProcessReturn) {
    return (
      <DashboardLayout>
        <ReturnProcessPage />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Returns Management
            </h1>
            <p className="text-gray-500">Manage product returns and refunds</p>
          </div>
          <Button onClick={() => setShowProcessReturn(true)}>
            <Plus className="mr-2 h-4 w-4" /> Process New Return
          </Button>
        </div>

        <ReturnsTable />
      </div>
    </DashboardLayout>
  );
}
