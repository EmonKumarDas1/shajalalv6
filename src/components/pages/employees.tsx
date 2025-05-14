import { DashboardLayout } from "../dashboard/layout/DashboardLayout";
import { EmployeesTable } from "../dashboard/employees/EmployeesTable";

export default function Employees() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="text-gray-500">Manage your employee records</p>
        </div>
        <EmployeesTable />
      </div>
    </DashboardLayout>
  );
}
