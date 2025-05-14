import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../../supabase/supabase";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Edit,
  Trash2,
  Plus,
  Search,
  DollarSign,
  Filter,
  FileText,
  Calendar,
  Clock,
  Download,
  BarChart,
  Users,
  Printer,
  Calculator,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/components/ui/use-toast";
import { Employee, PaymentFrequency } from "@/types/schema";
import { EmployeeForm } from "./EmployeeForm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePDF } from "react-to-pdf";

export function EmployeesTable() {
  // Define a custom error handler for Supabase operations
  const handleSupabaseError = (error: any, title: string) => {
    console.error(`${title}:`, error);
    let errorMessage = "An unexpected error occurred";

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "object" && error !== null) {
      errorMessage = JSON.stringify(error);
    } else if (error !== null && error !== undefined) {
      errorMessage = String(error);
    }

    toast({
      variant: "destructive",
      title: title,
      description: errorMessage,
    });
  };

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [salaryEmployee, setSalaryEmployee] = useState<Employee | null>(null);
  const [newSalary, setNewSalary] = useState<string>("");
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [payrollEmployee, setPayrollEmployee] = useState<Employee | null>(null);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [payrollDate, setPayrollDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [payrollFrequency, setPayrollFrequency] =
    useState<PaymentFrequency>("monthly");
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [payslipEmployee, setPayslipEmployee] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState("employees");
  const [reportType, setReportType] = useState("status");
  const payslipRef = useRef<HTMLDivElement>(null);
  const { toPDF } = usePDF();

  // Payroll adjustment states
  const [payrollAllowances, setPayrollAllowances] = useState<string>("0");
  const [payrollBonuses, setPayrollBonuses] = useState<string>("0");
  const [payrollOvertime, setPayrollOvertime] = useState<string>("0");
  const [payrollDeductions, setPayrollDeductions] = useState<string>("0");
  const [payrollIncomeTax, setPayrollIncomeTax] = useState<string>("0");
  const [payrollProvidentFund, setPayrollProvidentFund] = useState<string>("0");
  const [payrollInsurance, setPayrollInsurance] = useState<string>("0");
  const [payrollOtherDeductions, setPayrollOtherDeductions] =
    useState<string>("0");

  useEffect(() => {
    fetchEmployees();

    const subscription = supabase
      .channel("employees_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employees" },
        () => {
          fetchEmployees();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // Check if employee_images bucket exists, if not create it
  useEffect(() => {
    async function checkAndCreateBucket() {
      try {
        // Check if bucket exists
        const { data: buckets, error } = await supabase.storage.listBuckets();

        if (error) {
          console.error("Error checking buckets:", error);
          return;
        }

        const bucketExists = buckets.some(
          (bucket) => bucket.name === "employee_images",
        );

        if (!bucketExists) {
          // Create the bucket if it doesn't exist
          const { error: createError } = await supabase.storage.createBucket(
            "employee_images",
            {
              public: true,
            },
          );

          if (createError) {
            console.error("Error creating bucket:", createError);
          } else {
            console.log("Created employee_images bucket");
          }
        }
      } catch (err) {
        console.error("Error in bucket check:", err);
      }
    }

    checkAndCreateBucket();
  }, []);

  async function fetchEmployees() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("name");

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      handleSupabaseError(error, "Error fetching employees");
    } finally {
      setLoading(false);
    }
  }

  async function deleteEmployee() {
    if (!currentEmployee) return;

    try {
      const { error } = await supabase
        .from("employees")
        .delete()
        .eq("id", currentEmployee.id);

      if (error) throw error;

      toast({
        title: "Employee deleted",
        description: "The employee has been deleted successfully",
      });

      setCurrentEmployee(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      handleSupabaseError(error, "Error deleting employee");
    }
  }

  function handleEditClick(employee: Employee) {
    setCurrentEmployee(employee);
    setIsEditDialogOpen(true);
  }

  function handleDeleteClick(employee: Employee) {
    setCurrentEmployee(employee);
    setIsDeleteDialogOpen(true);
  }

  function handleSalaryClick(employee: Employee) {
    setSalaryEmployee(employee);
    // Use basic salary if available, otherwise use the net salary
    setNewSalary(
      employee.salary_structure?.basic_salary?.toString() ||
        employee.salary?.toString() ||
        "",
    );
    setShowSalaryModal(true);
  }

  async function updateSalary() {
    if (!salaryEmployee || !newSalary) return;

    try {
      setSalaryLoading(true);

      // Get the current employee data first
      const { data: currentData, error: fetchError } = await supabase
        .from("employees")
        .select("*")
        .eq("id", salaryEmployee.id)
        .single();

      if (fetchError) throw fetchError;

      // Update the salary structure with the new salary
      const updatedSalaryStructure = {
        ...(currentData.salary_structure || {}),
        basic_salary: Number(newSalary),
      };

      // Calculate the net salary based on the updated salary structure and tax deductions
      const taxDeductions = currentData.tax_deductions || {
        income_tax: 0,
        provident_fund: 0,
        insurance: 0,
        other_deductions: 0,
      };

      const totalDeductions =
        (updatedSalaryStructure.deductions || 0) +
        (taxDeductions.income_tax || 0) +
        (taxDeductions.provident_fund || 0) +
        (taxDeductions.insurance || 0) +
        (taxDeductions.other_deductions || 0);

      const grossAmount =
        Number(newSalary) +
        (updatedSalaryStructure.allowances || 0) +
        (updatedSalaryStructure.bonuses || 0) +
        (updatedSalaryStructure.overtime || 0);

      const netSalary = grossAmount - totalDeductions;

      // Update the employee record
      const { error } = await supabase
        .from("employees")
        .update({
          salary: netSalary,
          salary_structure: updatedSalaryStructure,
          updated_at: new Date().toISOString(),
        })
        .eq("id", salaryEmployee.id);

      if (error) throw error;

      toast({
        title: "Salary updated",
        description: "The employee's salary has been updated successfully",
      });

      setShowSalaryModal(false);
      setSalaryEmployee(null);
      setNewSalary("");
      fetchEmployees();
    } catch (error) {
      console.error("Error updating salary:", error);
      toast({
        variant: "destructive",
        title: "Error updating salary",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSalaryLoading(false);
    }
  }

  function handlePayrollClick(employee: Employee) {
    setPayrollEmployee(employee);
    setPayrollFrequency(employee.payment_frequency || "monthly");

    // Initialize payroll adjustment fields with employee's current values
    setPayrollAllowances(
      (employee.salary_structure?.allowances || 0).toString(),
    );
    setPayrollBonuses((employee.salary_structure?.bonuses || 0).toString());
    setPayrollOvertime((employee.salary_structure?.overtime || 0).toString());
    setPayrollDeductions(
      (employee.salary_structure?.deductions || 0).toString(),
    );
    setPayrollIncomeTax((employee.tax_deductions?.income_tax || 0).toString());
    setPayrollProvidentFund(
      (employee.tax_deductions?.provident_fund || 0).toString(),
    );
    setPayrollInsurance((employee.tax_deductions?.insurance || 0).toString());
    setPayrollOtherDeductions(
      (employee.tax_deductions?.other_deductions || 0).toString(),
    );

    setShowPayrollModal(true);
  }

  async function processPayroll() {
    if (!payrollEmployee) return;

    try {
      console.log("Starting payroll processing for:", payrollEmployee.name);
      setPayrollLoading(true);

      // Calculate salary components using the adjusted values
      const basicSalary = payrollEmployee.salary_structure?.basic_salary || 0;
      const allowances = Number(payrollAllowances) || 0;
      const deductions = Number(payrollDeductions) || 0;
      const bonuses = Number(payrollBonuses) || 0;
      const overtime = Number(payrollOvertime) || 0;

      // Calculate tax deductions using the adjusted values
      const incomeTax = Number(payrollIncomeTax) || 0;
      const providentFund = Number(payrollProvidentFund) || 0;
      const insurance = Number(payrollInsurance) || 0;
      const otherDeductions = Number(payrollOtherDeductions) || 0;

      // Calculate gross and net salary
      const grossAmount = basicSalary + allowances + bonuses + overtime;
      const totalDeductions =
        deductions + incomeTax + providentFund + insurance + otherDeductions;
      const netAmount = grossAmount - totalDeductions;

      // Create payroll record with the adjusted values
      const salaryStructure = {
        basic_salary: basicSalary,
        allowances: allowances,
        deductions: deductions,
        bonuses: bonuses,
        overtime: overtime,
      };

      const taxDeductions = {
        income_tax: incomeTax,
        provident_fund: providentFund,
        insurance: insurance,
        other_deductions: otherDeductions,
      };

      // Ensure all values are properly formatted
      const payrollData = {
        employee_id: payrollEmployee.id,
        payment_date: payrollDate || new Date().toISOString().split("T")[0],
        gross_amount: grossAmount,
        net_amount: netAmount,
        payment_frequency: payrollFrequency || "monthly",
        salary_structure: salaryStructure,
        tax_deductions: taxDeductions,
        status: "paid",
        created_at: new Date().toISOString(),
      };

      try {
        // Check if the payrolls table exists
        const { error: tableCheckError } = await supabase
          .from("payrolls")
          .select("id")
          .limit(1);

        if (tableCheckError) {
          console.log("Table check error:", tableCheckError);

          // Create the payrolls table without relying on the extension
          // We'll use client-side UUID generation instead

          const createTableSQL = `
            CREATE TABLE IF NOT EXISTS payrolls (
              id UUID PRIMARY KEY,
              employee_id UUID REFERENCES employees(id),
              payment_date DATE,
              gross_amount NUMERIC,
              net_amount NUMERIC,
              payment_frequency TEXT,
              salary_structure JSONB,
              tax_deductions JSONB,
              status TEXT,
              created_at TIMESTAMP WITH TIME ZONE,
              updated_at TIMESTAMP WITH TIME ZONE
            );
          `;

          // Execute the SQL to create the table
          const { error: createError } = await supabase.rpc("exec", {
            sql: createTableSQL,
          });
          if (createError) {
            console.error("Error creating payrolls table:", createError);
            throw new Error(
              "Failed to create payrolls table: " + createError.message,
            );
          }
        }
      } catch (err) {
        console.error("Error checking/creating payrolls table:", err);
        throw new Error(
          "Failed to set up payroll system: " +
            (err instanceof Error ? err.message : String(err)),
        );
      }

      // Insert the payroll record with a client-generated UUID
      try {
        // Generate a UUID for the payroll record
        const payrollId = crypto.randomUUID();
        const payrollDataWithId = {
          ...payrollData,
          id: payrollId,
        };

        const { error } = await supabase
          .from("payrolls")
          .insert([payrollDataWithId]);
        if (error) {
          console.error("Error inserting payroll record:", error);
          throw new Error("Failed to insert payroll record: " + error.message);
        }
      } catch (err) {
        console.error("Error processing payroll insertion:", err);
        throw new Error(
          "Failed to process payroll: " +
            (err instanceof Error ? err.message : String(err)),
        );
      }

      // Also update the employee's salary structure and tax deductions
      const { error: updateError } = await supabase
        .from("employees")
        .update({
          salary_structure: salaryStructure,
          tax_deductions: taxDeductions,
          salary: netAmount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payrollEmployee.id);

      if (updateError) throw updateError;

      toast({
        title: "Payroll processed",
        description: `Payroll for ${payrollEmployee.name} has been processed successfully`,
      });

      setShowPayrollModal(false);
      setPayrollEmployee(null);
      fetchEmployees(); // Refresh the employee list
    } catch (error) {
      console.error("Error processing payroll:", error);
      let errorMessage = "An error occurred while processing payroll";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "object" && error !== null) {
        errorMessage = JSON.stringify(error);
      }

      toast({
        variant: "destructive",
        title: "Error processing payroll",
        description: errorMessage,
      });
    } finally {
      setPayrollLoading(false);
    }
  }

  function handlePayslipClick(employee: Employee) {
    setPayslipEmployee(employee);
    setShowPayslipModal(true);
  }

  function downloadPayslip() {
    if (payslipRef.current) {
      toPDF(payslipRef.current, {
        filename: `payslip_${payslipEmployee?.name.replace(/\s+/g, "_").toLowerCase()}_${new Date().toISOString().split("T")[0]}.pdf`,
      });
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "border-green-200 bg-green-50 text-green-600";
      case "inactive":
        return "border-red-200 bg-red-50 text-red-600";
      case "on leave":
        return "border-yellow-200 bg-yellow-50 text-yellow-600";
      default:
        return "border-gray-200 bg-gray-50 text-gray-600";
    }
  };

  const filteredEmployees = employees.filter((employee) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      employee.name.toLowerCase().includes(searchLower) ||
      (employee.position?.toLowerCase() || "").includes(searchLower) ||
      (employee.email?.toLowerCase() || "").includes(searchLower) ||
      (employee.phone?.toLowerCase() || "").includes(searchLower);

    const matchesStatus =
      statusFilter === "all" || employee.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4 bg-white p-6 rounded-lg shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription>
                Enter the details for the new employee.
              </DialogDescription>
            </DialogHeader>
            <EmployeeForm
              onSuccess={() => {
                setIsAddDialogOpen(false);
                fetchEmployees();
              }}
              onCancel={() => setIsAddDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Employees
          </TabsTrigger>

          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            Reports & Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Employee Management
              </CardTitle>
              <CardDescription>
                Manage your employees, their details, and their salaries
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center bg-gray-50 p-4 rounded-lg">
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      type="search"
                      placeholder="Search employees by name, position, email, or phone..."
                      className="w-full bg-white pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="on leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  {searchQuery
                    ? "No employees match your search."
                    : "No employees found. Add your first employee to get started."}
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Hire Date</TableHead>
                        <TableHead>Salary</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.map((employee) => (
                        <TableRow
                          key={employee.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border border-gray-200">
                                {employee.profile_image ? (
                                  <AvatarImage
                                    src={employee.profile_image}
                                    alt={employee.name}
                                  />
                                ) : null}
                                <AvatarFallback>
                                  {employee.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">
                                {employee.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{employee.position || "-"}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {employee.email && (
                                <div className="text-sm">{employee.email}</div>
                              )}
                              {employee.phone && (
                                <div className="text-sm text-gray-500">
                                  {employee.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {employee.hire_date
                              ? new Date(
                                  employee.hire_date,
                                ).toLocaleDateString()
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {employee.salary ? (
                              <span className="font-medium text-green-600">
                                ${employee.salary.toFixed(2)}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`${getStatusColor(employee.status)} capitalize`}
                            >
                              {employee.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <div className="flex justify-end gap-2">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Payroll Actions"
                                  >
                                    <DollarSign className="h-4 w-4 text-green-600" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-56" align="end">
                                  <div className="grid gap-2">
                                    <Button
                                      variant="outline"
                                      className="justify-start"
                                      size="sm"
                                      onClick={() =>
                                        handleSalaryClick(employee)
                                      }
                                    >
                                      <DollarSign className="mr-2 h-4 w-4 text-green-600" />
                                      Update Salary
                                    </Button>
                                    <Button
                                      variant="outline"
                                      className="justify-start"
                                      size="sm"
                                      onClick={() =>
                                        handlePayrollClick(employee)
                                      }
                                    >
                                      <Calendar className="mr-2 h-4 w-4 text-blue-600" />
                                      Process Payroll
                                    </Button>
                                    <Button
                                      variant="outline"
                                      className="justify-start"
                                      size="sm"
                                      onClick={() =>
                                        handlePayslipClick(employee)
                                      }
                                    >
                                      <FileText className="mr-2 h-4 w-4 text-purple-600" />
                                      Generate Payslip
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditClick(employee)}
                                title="Edit Employee"
                                className="hover:bg-blue-50"
                              >
                                <Edit className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(employee)}
                                title="Delete Employee"
                                className="hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Payroll Management
              </CardTitle>
              <CardDescription>
                Process payroll, manage salary structures, and generate payslips
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      Process Payroll
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500 mb-4">
                      Process payroll for all active employees based on their
                      salary structure and payment frequency.
                    </p>
                    <Button className="w-full" variant="outline">
                      <Calendar className="mr-2 h-4 w-4" />
                      Bulk Process Payroll
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-purple-600" />
                      Generate Payslips
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500 mb-4">
                      Generate and download payslips for employees for the
                      current or previous pay periods.
                    </p>
                    <Button className="w-full" variant="outline">
                      <FileText className="mr-2 h-4 w-4" />
                      Bulk Generate Payslips
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5 text-orange-600" />
                      Payment Schedule
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500 mb-4">
                      View and manage upcoming payroll schedules based on
                      employee payment frequencies.
                    </p>
                    <Button className="w-full" variant="outline">
                      <Clock className="mr-2 h-4 w-4" />
                      View Payment Schedule
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">
                  Recent Payroll Activities
                </h3>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Payment Date</TableHead>
                        <TableHead>Gross Amount</TableHead>
                        <TableHead>Net Amount</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* This would be populated with actual payroll data */}
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-6 text-gray-500"
                        >
                          No recent payroll activities found.
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5 text-blue-600" />
                Employee Reports & Analytics
              </CardTitle>
              <CardDescription>
                Generate and view various employee and payroll reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <Label htmlFor="reportType" className="mb-2 block">
                    Report Type
                  </Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="status">
                        Employee Status Report
                      </SelectItem>
                      <SelectItem value="attendance">
                        Attendance Report
                      </SelectItem>
                      <SelectItem value="salary">
                        Salary & Payroll Report
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button className="flex items-center gap-2">
                    <Printer className="h-4 w-4" />
                    Generate Report
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                {reportType === "status" && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">
                        Employee Status Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                          <h3 className="text-sm font-medium text-green-800">
                            Active Employees
                          </h3>
                          <p className="text-2xl font-bold text-green-600 mt-2">
                            {
                              employees.filter((e) => e.status === "active")
                                .length
                            }
                          </p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                          <h3 className="text-sm font-medium text-red-800">
                            Inactive Employees
                          </h3>
                          <p className="text-2xl font-bold text-red-600 mt-2">
                            {
                              employees.filter((e) => e.status === "inactive")
                                .length
                            }
                          </p>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                          <h3 className="text-sm font-medium text-yellow-800">
                            On Leave
                          </h3>
                          <p className="text-2xl font-bold text-yellow-600 mt-2">
                            {
                              employees.filter((e) => e.status === "on leave")
                                .length
                            }
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {reportType === "attendance" && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">
                        Attendance Report
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-gray-500">
                        <p>
                          Attendance tracking module is not yet implemented.
                        </p>
                        <p className="mt-2">
                          This will show attendance statistics when available.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {reportType === "salary" && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">
                        Salary & Payroll Report
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <h3 className="text-sm font-medium text-blue-800">
                              Total Monthly Payroll
                            </h3>
                            <p className="text-2xl font-bold text-blue-600 mt-2">
                              $
                              {employees
                                .reduce(
                                  (sum, emp) => sum + (emp.salary || 0),
                                  0,
                                )
                                .toFixed(2)}
                            </p>
                          </div>
                          <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                            <h3 className="text-sm font-medium text-purple-800">
                              Average Salary
                            </h3>
                            <p className="text-2xl font-bold text-purple-600 mt-2">
                              $
                              {employees.length > 0
                                ? (
                                    employees.reduce(
                                      (sum, emp) => sum + (emp.salary || 0),
                                      0,
                                    ) / employees.length
                                  ).toFixed(2)
                                : "0.00"}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-md border overflow-x-auto mt-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Employee</TableHead>
                                <TableHead>Position</TableHead>
                                <TableHead>Basic Salary</TableHead>
                                <TableHead>Allowances</TableHead>
                                <TableHead>Deductions</TableHead>
                                <TableHead>Net Salary</TableHead>
                                <TableHead>Frequency</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {employees.length === 0 ? (
                                <TableRow>
                                  <TableCell
                                    colSpan={7}
                                    className="text-center py-6 text-gray-500"
                                  >
                                    No employees found.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                employees.map((employee) => (
                                  <TableRow key={employee.id}>
                                    <TableCell>{employee.name}</TableCell>
                                    <TableCell>
                                      {employee.position || "-"}
                                    </TableCell>
                                    <TableCell>
                                      $
                                      {employee.salary_structure?.basic_salary?.toFixed(
                                        2,
                                      ) || "0.00"}
                                    </TableCell>
                                    <TableCell>
                                      $
                                      {employee.salary_structure?.allowances?.toFixed(
                                        2,
                                      ) || "0.00"}
                                    </TableCell>
                                    <TableCell>
                                      $
                                      {employee.salary_structure?.deductions?.toFixed(
                                        2,
                                      ) || "0.00"}
                                    </TableCell>
                                    <TableCell>
                                      ${employee.salary?.toFixed(2) || "0.00"}
                                    </TableCell>
                                    <TableCell className="capitalize">
                                      {employee.payment_frequency || "monthly"}
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Update the employee details.</DialogDescription>
          </DialogHeader>
          {currentEmployee && (
            <EmployeeForm
              employee={currentEmployee}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                setCurrentEmployee(null);
                fetchEmployees();
              }}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setCurrentEmployee(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this employee? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteEmployee}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Salary Update Dialog */}
      <Dialog open={showSalaryModal} onOpenChange={setShowSalaryModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Salary</DialogTitle>
            <DialogDescription>
              Update the basic salary for {salaryEmployee?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-salary">Current Basic Salary</Label>
              <Input
                id="current-salary"
                value={
                  salaryEmployee?.salary_structure?.basic_salary
                    ? `${salaryEmployee.salary_structure.basic_salary.toFixed(2)}`
                    : salaryEmployee?.salary
                      ? `${salaryEmployee.salary.toFixed(2)}`
                      : "Not set"
                }
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-salary">New Basic Salary</Label>
              <Input
                id="new-salary"
                type="number"
                step="0.01"
                min="0"
                value={newSalary}
                onChange={(e) => setNewSalary(e.target.value)}
                placeholder="Enter new basic salary amount"
              />
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-md text-sm text-blue-700">
              <p>
                Updating the basic salary will recalculate the employee's net
                salary based on their allowances, bonuses, and deductions.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSalaryModal(false)}
              disabled={salaryLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={updateSalary}
              disabled={!newSalary || salaryLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {salaryLoading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Updating...
                </span>
              ) : (
                "Update Salary"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Process Payroll Dialog */}
      <Dialog open={showPayrollModal} onOpenChange={setShowPayrollModal}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Process Payroll
            </DialogTitle>
            <DialogDescription>
              Process payroll for {payrollEmployee?.name}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment-date">Payment Date</Label>
                  <Input
                    id="payment-date"
                    type="date"
                    value={payrollDate}
                    onChange={(e) => setPayrollDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-frequency">Payment Frequency</Label>
                  <Select
                    value={payrollFrequency}
                    onValueChange={(value) =>
                      setPayrollFrequency(value as PaymentFrequency)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {payrollEmployee && (
                <div className="mt-4">
                  <Tabs defaultValue="salary" className="w-full">
                    <TabsList className="grid grid-cols-2 mb-4">
                      <TabsTrigger
                        value="salary"
                        className="flex items-center gap-2"
                      >
                        <DollarSign className="h-4 w-4" />
                        Salary Components
                      </TabsTrigger>
                      <TabsTrigger
                        value="tax"
                        className="flex items-center gap-2"
                      >
                        <Calculator className="h-4 w-4" />
                        Tax & Deductions
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="salary" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="basic-salary">Basic Salary</Label>
                          <Input
                            id="basic-salary"
                            type="text"
                            value={
                              payrollEmployee.salary_structure?.basic_salary?.toFixed(
                                2,
                              ) || "0.00"
                            }
                            disabled
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="allowances">Allowances</Label>
                          <Input
                            id="allowances"
                            type="number"
                            step="0.01"
                            min="0"
                            value={payrollAllowances}
                            onChange={(e) =>
                              setPayrollAllowances(e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bonuses">Bonuses</Label>
                          <Input
                            id="bonuses"
                            type="number"
                            step="0.01"
                            min="0"
                            value={payrollBonuses}
                            onChange={(e) => setPayrollBonuses(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="overtime">Overtime</Label>
                          <Input
                            id="overtime"
                            type="number"
                            step="0.01"
                            min="0"
                            value={payrollOvertime}
                            onChange={(e) => setPayrollOvertime(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="deductions">Deductions</Label>
                          <Input
                            id="deductions"
                            type="number"
                            step="0.01"
                            min="0"
                            value={payrollDeductions}
                            onChange={(e) =>
                              setPayrollDeductions(e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="tax" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="income-tax">Income Tax</Label>
                          <Input
                            id="income-tax"
                            type="number"
                            step="0.01"
                            min="0"
                            value={payrollIncomeTax}
                            onChange={(e) =>
                              setPayrollIncomeTax(e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="provident-fund">Provident Fund</Label>
                          <Input
                            id="provident-fund"
                            type="number"
                            step="0.01"
                            min="0"
                            value={payrollProvidentFund}
                            onChange={(e) =>
                              setPayrollProvidentFund(e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="insurance">Insurance</Label>
                          <Input
                            id="insurance"
                            type="number"
                            step="0.01"
                            min="0"
                            value={payrollInsurance}
                            onChange={(e) =>
                              setPayrollInsurance(e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="other-deductions">
                            Other Deductions
                          </Label>
                          <Input
                            id="other-deductions"
                            type="number"
                            step="0.01"
                            min="0"
                            value={payrollOtherDeductions}
                            onChange={(e) =>
                              setPayrollOtherDeductions(e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="mt-4 p-4 bg-gray-50 rounded-md border">
                    <h3 className="font-medium mb-2">Salary Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Basic Salary:</span>
                        <span>
                          $
                          {payrollEmployee.salary_structure?.basic_salary?.toFixed(
                            2,
                          ) || "0.00"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Allowances:</span>
                        <span>${Number(payrollAllowances).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bonuses:</span>
                        <span>${Number(payrollBonuses).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Overtime:</span>
                        <span>${Number(payrollOvertime).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Deductions:</span>
                        <span>-${Number(payrollDeductions).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax Deductions:</span>
                        <span>
                          -$
                          {(
                            Number(payrollIncomeTax) +
                            Number(payrollProvidentFund) +
                            Number(payrollInsurance) +
                            Number(payrollOtherDeductions)
                          ).toFixed(2)}
                        </span>
                      </div>
                      <div className="border-t pt-2 mt-2 flex justify-between font-medium">
                        <span>Net Salary:</span>
                        <span>
                          $
                          {(
                            (payrollEmployee.salary_structure?.basic_salary ||
                              0) +
                            Number(payrollAllowances) +
                            Number(payrollBonuses) +
                            Number(payrollOvertime) -
                            Number(payrollDeductions) -
                            Number(payrollIncomeTax) -
                            Number(payrollProvidentFund) -
                            Number(payrollInsurance) -
                            Number(payrollOtherDeductions)
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPayrollModal(false)}
              disabled={payrollLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={processPayroll}
              disabled={payrollLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {payrollLoading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Processing...
                </span>
              ) : (
                "Process Payroll"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payslip Dialog */}
      <Dialog open={showPayslipModal} onOpenChange={setShowPayslipModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              Employee Payslip
            </DialogTitle>
            <DialogDescription>
              Payslip for {payslipEmployee?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mb-4">
            <Button
              onClick={downloadPayslip}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Payslip
            </Button>
          </div>
          <ScrollArea className="h-[60vh]">
            <div
              ref={payslipRef}
              className="bg-white p-6 border rounded-lg space-y-6"
            >
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h2 className="text-xl font-bold">Payslip</h2>
                  <p className="text-gray-500">
                    For the period ending {format(new Date(), "MMMM dd, yyyy")}
                  </p>
                </div>
                <div className="text-right">
                  <h3 className="font-bold text-lg">Company Name</h3>
                  <p className="text-gray-500">123 Business Street</p>
                  <p className="text-gray-500">City, State ZIP</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Employee Details</h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="font-medium">Name:</span>{" "}
                      {payslipEmployee?.name}
                    </p>
                    <p>
                      <span className="font-medium">Position:</span>{" "}
                      {payslipEmployee?.position || "N/A"}
                    </p>
                    <p>
                      <span className="font-medium">Employee ID:</span>{" "}
                      {payslipEmployee?.id.substring(0, 8)}
                    </p>
                    <p>
                      <span className="font-medium">Payment Date:</span>{" "}
                      {format(new Date(), "MMMM dd, yyyy")}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Payment Details</h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="font-medium">Payment Method:</span> Bank
                      Transfer
                    </p>
                    <p>
                      <span className="font-medium">Bank Account:</span> ****
                      {payslipEmployee?.bank_account?.slice(-4) || "N/A"}
                    </p>
                    <p>
                      <span className="font-medium">Payment Frequency:</span>{" "}
                      <span className="capitalize">
                        {payslipEmployee?.payment_frequency || "Monthly"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Earnings
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Basic Salary
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        $
                        {payslipEmployee?.salary_structure?.basic_salary?.toFixed(
                          2,
                        ) || "0.00"}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Allowances
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        $
                        {payslipEmployee?.salary_structure?.allowances?.toFixed(
                          2,
                        ) || "0.00"}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Bonuses
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        $
                        {payslipEmployee?.salary_structure?.bonuses?.toFixed(
                          2,
                        ) || "0.00"}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Overtime
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        $
                        {payslipEmployee?.salary_structure?.overtime?.toFixed(
                          2,
                        ) || "0.00"}
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Gross Earnings
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                        $
                        {(
                          (payslipEmployee?.salary_structure?.basic_salary ||
                            0) +
                          (payslipEmployee?.salary_structure?.allowances || 0) +
                          (payslipEmployee?.salary_structure?.bonuses || 0) +
                          (payslipEmployee?.salary_structure?.overtime || 0)
                        ).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Deductions
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Income Tax
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        $
                        {payslipEmployee?.tax_deductions?.income_tax?.toFixed(
                          2,
                        ) || "0.00"}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Provident Fund
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        $
                        {payslipEmployee?.tax_deductions?.provident_fund?.toFixed(
                          2,
                        ) || "0.00"}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Insurance
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        $
                        {payslipEmployee?.tax_deductions?.insurance?.toFixed(
                          2,
                        ) || "0.00"}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Other Deductions
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        $
                        {payslipEmployee?.tax_deductions?.other_deductions?.toFixed(
                          2,
                        ) || "0.00"}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Salary Deductions
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        $
                        {payslipEmployee?.salary_structure?.deductions?.toFixed(
                          2,
                        ) || "0.00"}
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Total Deductions
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                        $
                        {(
                          (payslipEmployee?.tax_deductions?.income_tax || 0) +
                          (payslipEmployee?.tax_deductions?.provident_fund ||
                            0) +
                          (payslipEmployee?.tax_deductions?.insurance || 0) +
                          (payslipEmployee?.tax_deductions?.other_deductions ||
                            0) +
                          (payslipEmployee?.salary_structure?.deductions || 0)
                        ).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg">Net Pay</h3>
                  <p className="font-bold text-lg">
                    ${payslipEmployee?.salary?.toFixed(2) || "0.00"}
                  </p>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Payment processed on {format(new Date(), "MMMM dd, yyyy")}
                </p>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
