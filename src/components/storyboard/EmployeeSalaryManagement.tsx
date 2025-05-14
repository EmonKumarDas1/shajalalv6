import { useState, useEffect } from "react";
import { supabase } from "../../../supabase/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { format, subMonths, isAfter } from "date-fns";
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Users,
  FileText,
  Clock,
  Calendar,
  Download,
  Filter,
  TrendingUp,
  BarChart3,
  Wallet,
} from "lucide-react";

export default function EmployeeSalaryManagement() {
  const [employees, setEmployees] = useState([]);
  const [salaryPayments, setSalaryPayments] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalMonthlySalary, setTotalMonthlySalary] = useState(0);
  const [paidThisMonth, setPaidThisMonth] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [pendingEmployees, setPendingEmployees] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [dateRange, setDateRange] = useState("monthly");
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isProcessingSalary, setIsProcessingSalary] = useState(false);

  useEffect(() => {
    fetchData();

    const subscriptions = [
      supabase
        .channel("employees_changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "employees" },
          () => fetchData(),
        )
        .subscribe(),
      supabase
        .channel("salary_payments_changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "salary_payments" },
          () => fetchData(),
        )
        .subscribe(),
      supabase
        .channel("payrolls_changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "payrolls" },
          () => fetchData(),
        )
        .subscribe(),
    ];

    return () => {
      subscriptions.forEach((sub) => supabase.removeChannel(sub));
    };
  }, [departmentFilter, dateRange]);

  async function fetchData() {
    try {
      setLoading(true);

      // Fetch employees with their salary details
      const { data: employeesData } = await supabase
        .from("employees")
        .select("*, salary_structure, tax_deductions")
        .order("name");

      // Fetch salary payments
      const { data: paymentsData } = await supabase
        .from("salary_payments")
        .select("*")
        .order("payment_date", { ascending: false });

      // Fetch payrolls with employee details
      const { data: payrollsData } = await supabase
        .from("payrolls")
        .select("*, employees(name, profile_image)")
        .order("created_at", { ascending: false });

      // Calculate metrics
      const total =
        employeesData?.reduce((sum, emp) => sum + (emp.salary || 0), 0) || 0;
      // Calculate employees who need payment this month
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      const pendingEmps =
        employeesData?.filter((emp) => {
          const lastPayment = paymentsData?.find(
            (p) =>
              p.employee_id === emp.id &&
              new Date(p.payment_date).getMonth() === currentMonth &&
              new Date(p.payment_date).getFullYear() === currentYear,
          );
          return !lastPayment && emp.status === "active";
        }) || [];

      const pendingAmount = pendingEmps.reduce(
        (sum, emp) => sum + (emp.salary || 0),
        0,
      );

      const paid = total - pendingAmount;

      setEmployees(employeesData || []);
      setSalaryPayments(paymentsData || []);
      setPayrolls(payrollsData || []);
      setTotalMonthlySalary(total);
      setPaidThisMonth(paid);
      setPendingPayments(pendingAmount);
      setPendingEmployees(pendingEmps);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        variant: "destructive",
        title: "Error fetching data",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  const calculateNetSalary = (employee) => {
    const salaryStructure = employee.salary_structure || {};
    const taxDeductions = employee.tax_deductions || {};

    const grossSalary =
      (salaryStructure.basic_salary || 0) +
      (salaryStructure.allowances || 0) +
      (salaryStructure.bonuses || 0) +
      (salaryStructure.overtime || 0);

    const totalDeductions =
      (salaryStructure.deductions || 0) +
      (taxDeductions.income_tax || 0) +
      (taxDeductions.provident_fund || 0) +
      (taxDeductions.insurance || 0) +
      (taxDeductions.other_deductions || 0);

    return grossSalary - totalDeductions;
  };

  const renderOverviewTab = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
      <Card className="w-full">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            Total Monthly Payroll
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="text-2xl sm:text-3xl font-bold text-blue-600">
            ${totalMonthlySalary.toFixed(2)}
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {employees.filter((e) => e.status === "active").length} active
            employees
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Paid This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">
            ${paidThisMonth.toFixed(2)}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {salaryPayments.length} payments processed
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            Pending Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-orange-600">
            ${pendingPayments.toFixed(2)}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {pendingEmployees.length} employees pending
          </p>
        </CardContent>
      </Card>

      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            Salary Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-around px-4">
            {["0-1000", "1001-2000", "2001-3000", "3001-4000", "4000+"].map(
              (range, index) => {
                const [min, max] = range.split("-").map(Number);
                const count = employees.filter((emp) => {
                  const salary = calculateNetSalary(emp);
                  return max ? salary >= min && salary <= max : salary > min;
                }).length;
                const maxCount = Math.max(
                  ...employees.map((emp) => calculateNetSalary(emp)),
                );
                const height = maxCount > 0 ? (count / maxCount) * 200 : 0;

                return (
                  <div
                    key={range}
                    className="flex flex-col items-center w-full max-w-[100px]"
                  >
                    <div
                      className="w-full bg-purple-500 rounded-t-md transition-all duration-500"
                      style={{ height: `${height}px` }}
                    />
                    <div className="mt-2 text-center w-full">
                      <p className="font-medium text-sm truncate">${range}</p>
                      <p className="text-xs text-gray-500">{count} employees</p>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPayrollTab = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="it">IT</SelectItem>
              <SelectItem value="hr">HR</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button className="flex items-center gap-2 w-full sm:w-auto">
          <Download className="h-4 w-4" />
          Export Payroll
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {employees.map((employee) => (
          <Card key={employee.id} className="overflow-hidden w-full">
            <CardContent className="p-4 sm:p-6 overflow-hidden">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <Avatar className="h-12 w-12 border border-gray-200 flex-shrink-0">
                  {employee.profile_image ? (
                    <AvatarImage
                      src={employee.profile_image}
                      alt={employee.name}
                    />
                  ) : null}
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {employee.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 w-full text-center sm:text-left overflow-hidden">
                  <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-2 sm:gap-4">
                    <div>
                      <h3 className="font-medium">{employee.name}</h3>
                      <p className="text-sm text-gray-500">
                        {employee.position || "No position"}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        employee.status === "active"
                          ? "bg-green-50 text-green-600"
                          : "bg-gray-50 text-gray-600"
                      }
                    >
                      {employee.status}
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4 overflow-hidden">
                    <div>
                      <p className="text-sm text-gray-500">Basic Salary</p>
                      <p className="font-medium">
                        $
                        {employee.salary_structure?.basic_salary?.toFixed(2) ||
                          "0.00"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Net Salary</p>
                      <p className="font-medium text-green-600">
                        ${calculateNetSalary(employee).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Payment Frequency</p>
                      <p className="font-medium">
                        {employee.payment_frequency || "Monthly"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Last Payment</p>
                      <p className="font-medium">
                        {employee.last_salary_payment
                          ? format(
                              new Date(employee.last_salary_payment),
                              "MMM dd, yyyy",
                            )
                          : "Not paid yet"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap justify-center sm:justify-end gap-2 sm:gap-3">
                    <Button
                      variant="outline"
                      className="flex items-center justify-center gap-1 w-full sm:w-auto min-w-[120px] px-3 py-2 text-sm"
                      onClick={() => handleViewDetails(employee)}
                    >
                      <FileText className="h-4 w-4" />
                      Details
                    </Button>
                    <Button
                      className="flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 w-full sm:w-auto min-w-[120px] px-3 py-2 text-sm"
                      onClick={() => openDatePicker(employee, true)}
                      disabled={
                        isProcessingSalary ||
                        isAutomatedSalaryProcessedThisMonth(employee)
                      }
                      title={
                        isAutomatedSalaryProcessedThisMonth(employee)
                          ? "Salary already processed this month"
                          : ""
                      }
                    >
                      <DollarSign className="h-4 w-4" />
                      {isProcessingSalary ? "Processing..." : "Process Salary"}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex items-center justify-center gap-1 w-full sm:w-auto min-w-[120px] px-3 py-2 text-sm"
                      onClick={() => openDatePicker(employee, false)}
                      disabled={isProcessingSalary}
                    >
                      <DollarSign className="h-4 w-4" />
                      Manual Payment
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Salary Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">+5.2%</div>
            <p className="text-sm text-gray-500 mt-1">vs. last quarter</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Department Split
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">4</div>
            <p className="text-sm text-gray-500 mt-1">active departments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Next Payroll
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {format(new Date(), "MMM dd")}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              estimated processing date
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add more analytics components here */}
    </div>
  );

  const handleViewDetails = (employee) => {
    setSelectedEmployee(employee);
    setIsViewDetailsOpen(true);
  };

  const isAutomatedSalaryProcessedThisMonth = (employee) => {
    if (!employee.last_automated_salary_date) return false;
    const lastProcessedDate = new Date(employee.last_automated_salary_date);
    const currentDate = new Date();
    return (
      lastProcessedDate.getMonth() === currentDate.getMonth() &&
      lastProcessedDate.getFullYear() === currentDate.getFullYear()
    );
  };

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedPaymentDate, setSelectedPaymentDate] = useState(new Date());
  const [employeeForPayment, setEmployeeForPayment] = useState(null);
  const [paymentType, setPaymentType] = useState(1); // 1 for automated, 2 for manual

  const openDatePicker = (employee, isAutomated = true) => {
    setEmployeeForPayment(employee);
    setPaymentType(isAutomated ? 1 : 2);
    setSelectedPaymentDate(new Date());
    setIsDatePickerOpen(true);
  };

  const handleProcessSalary = async () => {
    if (!employeeForPayment) return;

    try {
      setIsProcessingSalary(true);
      const employee = employeeForPayment;
      const isAutomated = paymentType === 1;

      // Check if automated salary was already processed this month
      if (isAutomated && isAutomatedSalaryProcessedThisMonth(employee)) {
        toast({
          variant: "destructive",
          title: "Salary already processed",
          description: "Automated salary has already been processed this month",
        });
        return;
      }

      // Calculate salary components
      const salaryStructure = employee.salary_structure || {};
      const taxDeductions = employee.tax_deductions || {};

      const grossAmount =
        (salaryStructure.basic_salary || 0) +
        (salaryStructure.allowances || 0) +
        (salaryStructure.bonuses || 0) +
        (salaryStructure.overtime || 0);

      const totalDeductions =
        (salaryStructure.deductions || 0) +
        (taxDeductions.income_tax || 0) +
        (taxDeductions.provident_fund || 0) +
        (taxDeductions.insurance || 0) +
        (taxDeductions.other_deductions || 0);

      const netAmount = grossAmount - totalDeductions;

      // Use the selected payment date
      const paymentDate = selectedPaymentDate.toISOString();

      // Create payroll record
      // Use numeric values for payment_type (1 for automated, 2 for manual)
      const paymentTypeValue = isAutomated ? 1 : 2;

      const { error: payrollError } = await supabase.from("payrolls").insert({
        employee_id: employee.id,
        payment_date: paymentDate,
        gross_amount: grossAmount,
        net_amount: netAmount,
        payment_frequency: employee.payment_frequency || "monthly",
        salary_structure: salaryStructure,
        tax_deductions: taxDeductions,
        status: "paid",
        created_at: new Date().toISOString(),
        payment_type: paymentTypeValue,
      });

      if (payrollError) throw payrollError;

      // Create salary payment record
      const { error: paymentError } = await supabase
        .from("salary_payments")
        .insert({
          employee_id: employee.id,
          amount: netAmount,
          payment_date: paymentDate,
          payment_method: "bank_transfer",
          status: "completed",
          created_at: new Date().toISOString(),
          payment_type: paymentTypeValue,
        });

      if (paymentError) throw paymentError;

      // Update employee's payment dates
      const updateData = {
        last_salary_payment: paymentDate,
        updated_at: new Date().toISOString(),
      };

      // Only update last_automated_salary_date for automated payments
      if (isAutomated) {
        updateData.last_automated_salary_date = paymentDate;
      }

      const { error: updateError } = await supabase
        .from("employees")
        .update(updateData)
        .eq("id", employee.id);

      if (updateError) throw updateError;

      toast({
        title: isAutomated ? "Salary processed" : "Manual payment processed",
        description: `Successfully processed ${isAutomated ? "salary" : "manual payment"} for ${employee.name} for ${format(selectedPaymentDate, "MMMM yyyy")}`,
      });

      // Close the date picker dialog
      setIsDatePickerOpen(false);

      // Refresh data
      fetchData();
    } catch (error) {
      console.error("Error processing salary:", error);
      let errorMessage = "An error occurred while processing salary";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error.code) {
        // Handle database errors
        switch (error.code) {
          case "23505": // Unique violation
            errorMessage = "A salary payment already exists for this period";
            break;
          case "23503": // Foreign key violation
            errorMessage = "Invalid employee reference";
            break;
          default:
            errorMessage = error.message || `Database error: ${error.code}`;
        }
      } else if (typeof error === "object") {
        errorMessage = error.message || JSON.stringify(error);
      }

      toast({
        variant: "destructive",
        title: "Error processing salary",
        description: errorMessage,
      });
    } finally {
      setIsProcessingSalary(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Salary Management
          </h1>
          <p className="text-gray-500">Manage employee salaries and payroll</p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="payroll" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payroll
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            renderOverviewTab()
          )}
        </TabsContent>

        <TabsContent value="payroll">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            renderPayrollTab()
          )}
        </TabsContent>

        <TabsContent value="analytics">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            renderAnalyticsTab()
          )}
        </TabsContent>
      </Tabs>

      {/* View Details Dialog */}
      {/* Employee Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Employee Salary Details</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border border-gray-200">
                  {selectedEmployee.profile_image ? (
                    <AvatarImage
                      src={selectedEmployee.profile_image}
                      alt={selectedEmployee.name}
                    />
                  ) : null}
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-xl">
                    {selectedEmployee.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">
                    {selectedEmployee.name}
                  </h3>
                  <p className="text-gray-500">
                    {selectedEmployee.position || "No position"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Salary Structure</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span>Basic Salary</span>
                      <span className="font-medium">
                        $
                        {selectedEmployee.salary_structure?.basic_salary?.toFixed(
                          2,
                        ) || "0.00"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Allowances</span>
                      <span className="font-medium">
                        $
                        {selectedEmployee.salary_structure?.allowances?.toFixed(
                          2,
                        ) || "0.00"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bonuses</span>
                      <span className="font-medium">
                        $
                        {selectedEmployee.salary_structure?.bonuses?.toFixed(
                          2,
                        ) || "0.00"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Overtime</span>
                      <span className="font-medium">
                        $
                        {selectedEmployee.salary_structure?.overtime?.toFixed(
                          2,
                        ) || "0.00"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Deductions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span>Income Tax</span>
                      <span className="font-medium">
                        $
                        {selectedEmployee.tax_deductions?.income_tax?.toFixed(
                          2,
                        ) || "0.00"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Provident Fund</span>
                      <span className="font-medium">
                        $
                        {selectedEmployee.tax_deductions?.provident_fund?.toFixed(
                          2,
                        ) || "0.00"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Insurance</span>
                      <span className="font-medium">
                        $
                        {selectedEmployee.tax_deductions?.insurance?.toFixed(
                          2,
                        ) || "0.00"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Other Deductions</span>
                      <span className="font-medium">
                        $
                        {selectedEmployee.tax_deductions?.other_deductions?.toFixed(
                          2,
                        ) || "0.00"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salaryPayments
                          .filter(
                            (payment) =>
                              payment.employee_id === selectedEmployee.id,
                          )
                          .map((payment, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                {format(
                                  new Date(payment.payment_date),
                                  "MMM dd, yyyy",
                                )}
                              </TableCell>
                              <TableCell className="font-medium">
                                ${payment.amount.toFixed(2)}
                              </TableCell>
                              <TableCell className="capitalize">
                                {payment.payment_method?.replace("_", " ") ||
                                  "-"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    payment.status === "completed"
                                      ? "bg-green-50 text-green-600"
                                      : "bg-yellow-50 text-yellow-600"
                                  }
                                >
                                  {payment.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Date Selection Dialog */}
      <Dialog open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Select Payment Date</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paymentDate" className="text-right">
                Payment Date
              </Label>
              <div className="col-span-3">
                <Input
                  id="paymentDate"
                  type="date"
                  value={format(selectedPaymentDate, "yyyy-MM-dd")}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedPaymentDate(new Date(e.target.value));
                    }
                  }}
                  className="w-full"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Salary will be processed for{" "}
                  {format(selectedPaymentDate, "MMMM yyyy")}
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDatePickerOpen(false)}
              disabled={isProcessingSalary}
            >
              Cancel
            </Button>
            <Button
              onClick={handleProcessSalary}
              disabled={isProcessingSalary}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessingSalary ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Processing...
                </span>
              ) : (
                "Process Payment"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
