import { DashboardLayout } from "../dashboard/layout/DashboardLayout";
import { SuppliersTable } from "../dashboard/suppliers/SuppliersTable";

export default function Suppliers() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-gray-500">Manage your suppliers</p>
        </div>
        <SuppliersTable />
      </div>
    </DashboardLayout>
  );
}
