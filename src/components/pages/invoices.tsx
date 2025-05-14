import { DashboardLayout } from "../dashboard/layout/DashboardLayout";
import { InvoicesTable } from "../dashboard/invoices/InvoicesTable";

export default function Invoices() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-gray-500">Manage and view transaction invoices</p>
        </div>
        <InvoicesTable />
      </div>
    </DashboardLayout>
  );
}
