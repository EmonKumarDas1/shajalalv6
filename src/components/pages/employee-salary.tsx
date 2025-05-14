import React from "react";
import { DashboardLayout } from "../dashboard/layout/DashboardLayout";
import EmployeeSalaryManagement from "../storyboard/EmployeeSalaryManagement";

export default function EmployeeSalaryPage() {
  return (
    <DashboardLayout>
      <EmployeeSalaryManagement />
    </DashboardLayout>
  );
}
