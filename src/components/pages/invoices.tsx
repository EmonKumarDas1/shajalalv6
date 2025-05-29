import { useState } from "react";
import { DashboardLayout } from "../dashboard/layout/DashboardLayout";
import { InvoicesTable } from "../dashboard/invoices/InvoicesTable";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { NewInvoiceForm } from "../dashboard/invoices/NewInvoiceForm";

export default function Invoices() {
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
            <p className="text-gray-500">
              Manage and view transaction invoices
            </p>
          </div>
          <Button
            onClick={() => setIsNewInvoiceOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> New Invoice
          </Button>
        </div>
        <InvoicesTable />
        <NewInvoiceForm
          open={isNewInvoiceOpen}
          onClose={() => setIsNewInvoiceOpen(false)}
        />
      </div>
    </DashboardLayout>
  );
}
