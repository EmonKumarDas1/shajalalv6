import { useState, useEffect } from "react";
import { supabase } from "../../../../supabase/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import {
  Employee,
  PaymentFrequency,
  SalaryStructure,
  TaxDeduction,
} from "@/types/schema";
import {
  Upload,
  X,
  Image,
  DollarSign,
  Clock,
  Calculator,
  FileText,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface EmployeeFormProps {
  employee?: Employee;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EmployeeForm({
  employee,
  onSuccess,
  onCancel,
}: EmployeeFormProps) {
  const [name, setName] = useState(employee?.name || "");
  const [position, setPosition] = useState(employee?.position || "");
  const [email, setEmail] = useState(employee?.email || "");
  const [phone, setPhone] = useState(employee?.phone || "");
  const [address, setAddress] = useState(employee?.address || "");
  const [hireDate, setHireDate] = useState(
    employee?.hire_date
      ? new Date(employee.hire_date).toISOString().split("T")[0]
      : "",
  );
  const [salary, setSalary] = useState<string>(
    employee?.salary?.toString() || "",
  );
  const [paymentFrequency, setPaymentFrequency] = useState<
    PaymentFrequency | ""
  >(employee?.payment_frequency || "monthly");

  // Salary Structure
  const [basicSalary, setBasicSalary] = useState<string>(
    employee?.salary_structure?.basic_salary?.toString() || "",
  );
  const [allowances, setAllowances] = useState<string>(
    employee?.salary_structure?.allowances?.toString() || "0",
  );
  const [deductions, setDeductions] = useState<string>(
    employee?.salary_structure?.deductions?.toString() || "0",
  );
  const [bonuses, setBonuses] = useState<string>(
    employee?.salary_structure?.bonuses?.toString() || "0",
  );
  const [overtime, setOvertime] = useState<string>(
    employee?.salary_structure?.overtime?.toString() || "0",
  );

  // Tax Deductions
  const [incomeTax, setIncomeTax] = useState<string>(
    employee?.tax_deductions?.income_tax?.toString() || "0",
  );
  const [providentFund, setProvidentFund] = useState<string>(
    employee?.tax_deductions?.provident_fund?.toString() || "0",
  );
  const [insurance, setInsurance] = useState<string>(
    employee?.tax_deductions?.insurance?.toString() || "0",
  );
  const [otherDeductions, setOtherDeductions] = useState<string>(
    employee?.tax_deductions?.other_deductions?.toString() || "0",
  );

  const [status, setStatus] = useState(employee?.status || "active");
  const [loading, setLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(
    employee?.profile_image || null,
  );
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("basic");

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

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image size should be less than 5MB");
      return;
    }

    try {
      setUploadLoading(true);
      setUploadError(null);

      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `employee_profiles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("employee_images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("employee_images")
        .getPublicUrl(filePath);

      setProfileImage(data.publicUrl);
      toast({
        title: "Image uploaded",
        description: "Profile image has been uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      setUploadError("Error uploading image. Please try again.");
      toast({
        variant: "destructive",
        title: "Upload Error",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setUploadLoading(false);
    }
  }

  function handleRemoveImage() {
    setProfileImage(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Employee name is required",
      });
      return;
    }

    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter a valid email address",
      });
      return;
    }

    try {
      setLoading(true);

      // Calculate total salary
      const calculatedBasicSalary = basicSalary ? Number(basicSalary) : 0;
      const calculatedAllowances = allowances ? Number(allowances) : 0;
      const calculatedDeductions = deductions ? Number(deductions) : 0;
      const calculatedBonuses = bonuses ? Number(bonuses) : 0;
      const calculatedOvertime = overtime ? Number(overtime) : 0;

      // Calculate total tax deductions
      const calculatedIncomeTax = incomeTax ? Number(incomeTax) : 0;
      const calculatedProvidentFund = providentFund ? Number(providentFund) : 0;
      const calculatedInsurance = insurance ? Number(insurance) : 0;
      const calculatedOtherDeductions = otherDeductions
        ? Number(otherDeductions)
        : 0;

      // Calculate gross and net salary
      const grossSalary =
        calculatedBasicSalary +
        calculatedAllowances +
        calculatedBonuses +
        calculatedOvertime;
      const totalDeductions =
        calculatedDeductions +
        calculatedIncomeTax +
        calculatedProvidentFund +
        calculatedInsurance +
        calculatedOtherDeductions;
      const netSalary = grossSalary - totalDeductions;

      const salaryStructure: SalaryStructure = {
        basic_salary: calculatedBasicSalary,
        allowances: calculatedAllowances,
        deductions: calculatedDeductions,
        bonuses: calculatedBonuses,
        overtime: calculatedOvertime,
      };

      const taxDeductions: TaxDeduction = {
        income_tax: calculatedIncomeTax,
        provident_fund: calculatedProvidentFund,
        insurance: calculatedInsurance,
        other_deductions: calculatedOtherDeductions,
      };

      const employeeData = {
        name: name.trim(),
        position: position.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        hire_date: hireDate ? new Date(hireDate).toISOString() : null,
        salary: netSalary > 0 ? netSalary : null,
        payment_frequency: paymentFrequency || null,
        salary_structure: salaryStructure,
        tax_deductions: taxDeductions,
        status,
        profile_image: profileImage,
        updated_at: new Date().toISOString(),
      };

      let result;

      try {
        if (employee) {
          // Update existing employee
          result = await supabase
            .from("employees")
            .update(employeeData)
            .eq("id", employee.id)
            .select();
        } else {
          // Create new employee
          result = await supabase
            .from("employees")
            .insert([employeeData])
            .select();
        }

        if (result.error) {
          console.error("Supabase operation error:", result.error);
          throw result.error;
        }
      } catch (err) {
        console.error("Database operation error:", err);
        let errorMessage = "Failed to save employee data";

        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === "object" && err !== null) {
          errorMessage = JSON.stringify(err);
        }

        throw new Error(errorMessage);
      }

      toast({
        title: employee ? "Employee updated" : "Employee created",
        description: employee
          ? "The employee has been updated successfully"
          : "The employee has been created successfully",
      });

      onSuccess();
    } catch (error) {
      console.error("Error saving employee:", error);
      toast({
        variant: "destructive",
        title: `Error ${employee ? "updating" : "creating"} employee`,
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  // Calculate salary summary
  const calculateSalarySummary = () => {
    const basic = Number(basicSalary) || 0;
    const allow = Number(allowances) || 0;
    const deduc = Number(deductions) || 0;
    const bonus = Number(bonuses) || 0;
    const over = Number(overtime) || 0;
    const tax = Number(incomeTax) || 0;
    const pf = Number(providentFund) || 0;
    const ins = Number(insurance) || 0;
    const other = Number(otherDeductions) || 0;

    const grossSalary = basic + allow + bonus + over;
    const totalDeductions = deduc + tax + pf + ins + other;
    const netSalary = grossSalary - totalDeductions;

    return {
      grossSalary,
      totalDeductions,
      netSalary,
    };
  };

  const salarySummary = calculateSalarySummary();

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 max-h-[70vh] overflow-y-auto pr-2"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-4">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Basic Info
          </TabsTrigger>
          <TabsTrigger value="salary" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Salary Structure
          </TabsTrigger>
          <TabsTrigger value="tax" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Tax & Deductions
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <div className="flex flex-col items-center mb-6">
            <div className="space-y-2 w-full max-w-xs">
              {uploadError && (
                <p className="text-sm text-red-500 mt-1">{uploadError}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter employee name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Enter position"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hireDate">Hire Date</Label>
              <Input
                id="hireDate"
                type="date"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="on leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentFrequency">Payment Frequency</Label>
              <Select
                value={paymentFrequency}
                onValueChange={(value) =>
                  setPaymentFrequency(value as PaymentFrequency)
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
        </TabsContent>

        <TabsContent value="salary" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Salary Structure
              </CardTitle>
              <CardDescription>
                Configure the employee's salary components
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="basicSalary">Basic Salary *</Label>
                  <Input
                    id="basicSalary"
                    type="number"
                    step="0.01"
                    min="0"
                    value={basicSalary}
                    onChange={(e) => setBasicSalary(e.target.value)}
                    placeholder="Enter basic salary amount"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allowances">Allowances</Label>
                  <Input
                    id="allowances"
                    type="number"
                    step="0.01"
                    min="0"
                    value={allowances}
                    onChange={(e) => setAllowances(e.target.value)}
                    placeholder="Enter allowances amount"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deductions">Deductions</Label>
                  <Input
                    id="deductions"
                    type="number"
                    step="0.01"
                    min="0"
                    value={deductions}
                    onChange={(e) => setDeductions(e.target.value)}
                    placeholder="Enter deductions amount"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bonuses">Bonuses</Label>
                  <Input
                    id="bonuses"
                    type="number"
                    step="0.01"
                    min="0"
                    value={bonuses}
                    onChange={(e) => setBonuses(e.target.value)}
                    placeholder="Enter bonuses amount"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="overtime">Overtime</Label>
                  <Input
                    id="overtime"
                    type="number"
                    step="0.01"
                    min="0"
                    value={overtime}
                    onChange={(e) => setOvertime(e.target.value)}
                    placeholder="Enter overtime amount"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-blue-600" />
                Tax & Deductions
              </CardTitle>
              <CardDescription>
                Configure tax and other deductions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="incomeTax">Income Tax</Label>
                  <Input
                    id="incomeTax"
                    type="number"
                    step="0.01"
                    min="0"
                    value={incomeTax}
                    onChange={(e) => setIncomeTax(e.target.value)}
                    placeholder="Enter income tax amount"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="providentFund">Provident Fund</Label>
                  <Input
                    id="providentFund"
                    type="number"
                    step="0.01"
                    min="0"
                    value={providentFund}
                    onChange={(e) => setProvidentFund(e.target.value)}
                    placeholder="Enter provident fund amount"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="insurance">Insurance</Label>
                  <Input
                    id="insurance"
                    type="number"
                    step="0.01"
                    min="0"
                    value={insurance}
                    onChange={(e) => setInsurance(e.target.value)}
                    placeholder="Enter insurance amount"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="otherDeductions">Other Deductions</Label>
                  <Input
                    id="otherDeductions"
                    type="number"
                    step="0.01"
                    min="0"
                    value={otherDeductions}
                    onChange={(e) => setOtherDeductions(e.target.value)}
                    placeholder="Enter other deductions amount"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                Salary Summary
              </CardTitle>
              <CardDescription>Summary of salary calculation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Gross Salary
                    </h3>
                    <p className="text-2xl font-bold text-green-600">
                      ${salarySummary.grossSalary.toFixed(2)}
                    </p>
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Basic Salary:</span>
                        <span>${Number(basicSalary || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Allowances:</span>
                        <span>${Number(allowances || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bonuses:</span>
                        <span>${Number(bonuses || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Overtime:</span>
                        <span>${Number(overtime || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Total Deductions
                    </h3>
                    <p className="text-2xl font-bold text-red-600">
                      ${salarySummary.totalDeductions.toFixed(2)}
                    </p>
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Deductions:</span>
                        <span>${Number(deductions || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Income Tax:</span>
                        <span>${Number(incomeTax || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Provident Fund:</span>
                        <span>${Number(providentFund || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Insurance:</span>
                        <span>${Number(insurance || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Other Deductions:</span>
                        <span>${Number(otherDeductions || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Net Salary</h3>
                  <p className="text-3xl font-bold text-blue-600">
                    ${salarySummary.netSalary.toFixed(2)}
                  </p>
                </div>

                <div className="flex justify-between items-center mt-4">
                  <h3 className="text-sm font-medium">Payment Frequency</h3>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="capitalize">
                      {paymentFrequency || "Monthly"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 sticky bottom-0 bg-white pt-4 pb-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              {employee ? "Updating..." : "Creating..."}
            </span>
          ) : (
            <>{employee ? "Update Employee" : "Create Employee"}</>
          )}
        </Button>
      </div>
    </form>
  );
}
