import { DashboardLayout } from "../dashboard/layout/DashboardLayout";
import { CostsTable } from "../dashboard/costs/CostsTable";

export default function Costs() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Other Costs</h1>
          <p className="text-gray-500">Manage your miscellaneous expenses</p>
        </div>
        <CostsTable />
      </div>
    </DashboardLayout>
  );
}
