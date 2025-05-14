import { useState, useEffect } from "react";
import { supabase } from "../../../../supabase/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CreditCard,
  ArrowUp,
  ArrowDown,
  DollarSign,
  TrendingDown,
  Wallet,
  Users,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, subDays, subMonths, subYears } from "date-fns";
import { Store } from "lucide-react";

type StatProps = {
  title: string;
  value: string;
  change: {
    value: string;
    type: "increase" | "decrease";
  };
  description: string;
  icon?: React.ReactNode;
  loading?: boolean;
};

function Stat({
  title,
  value,
  change,
  description,
  icon,
  loading = false,
}: StatProps) {
  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-gray-500">
            {title}
          </CardTitle>
        </div>
        <div className="h-8 w-8 rounded-full bg-gray-100 p-1">
          {icon || <CreditCard className="h-6 w-6 text-gray-600" />}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse">
            <div className="h-7 w-24 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 w-32 bg-gray-200 rounded"></div>
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <div className="mt-1 flex items-center text-sm">
              {change.type === "increase" ? (
                <ArrowUp className="mr-1 h-4 w-4 text-green-600" />
              ) : (
                <ArrowDown className="mr-1 h-4 w-4 text-red-600" />
              )}
              <span
                className={
                  change.type === "increase" ? "text-green-600" : "text-red-600"
                }
              >
                {change.value}
              </span>
              <span className="ml-1 text-gray-500">{description}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function RevenueStats() {
  const [loading, setLoading] = useState(true);
  const [dailyIncome, setDailyIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [netEarnings, setNetEarnings] = useState(0);
  const [incomeChange, setIncomeChange] = useState({
    value: "0%",
    type: "increase" as const,
  });
  const [expensesChange, setExpensesChange] = useState({
    value: "0%",
    type: "increase" as const,
  });
  const [earningsChange, setEarningsChange] = useState({
    value: "0%",
    type: "increase" as const,
  });
  const [timeFilter, setTimeFilter] = useState<
    "daily" | "monthly" | "yearly" | "custom"
  >("monthly");
  const [customDateRange, setCustomDateRange] = useState({
    startDate: subMonths(new Date(), 1).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [outerProductStats, setOuterProductStats] = useState({
    expenses: 0,
    income: 0,
    profit: 0,
  });

  useEffect(() => {
    fetchFinancialData();
    fetchOuterProductStats();

    // Set up real-time subscriptions
    const subscriptions = [
      supabase
        .channel("invoice_items_changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "invoice_items" },
          () => {
            fetchFinancialData();
            fetchOuterProductStats();
          },
        )
        .subscribe(),
      supabase
        .channel("others_costs_changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "others_costs" },
          () => fetchFinancialData(),
        )
        .subscribe(),
      supabase
        .channel("salary_payments_changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "salary_payments" },
          () => fetchFinancialData(),
        )
        .subscribe(),
      supabase
        .channel("payments_changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "payments" },
          () => fetchFinancialData(),
        )
        .subscribe(),
      supabase
        .channel("invoices_changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "invoices" },
          () => fetchFinancialData(),
        )
        .subscribe(),
    ];

    return () => {
      subscriptions.forEach((sub) => supabase.removeChannel(sub));
    };
  }, [timeFilter, customDateRange]);

  async function fetchOuterProductStats() {
    try {
      setLoading(true);

      // Determine date ranges based on timeFilter
      let currentPeriodStart: Date, currentPeriodEnd: Date;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      switch (timeFilter) {
        case "daily":
          currentPeriodStart = today;
          currentPeriodEnd = new Date(today);
          currentPeriodEnd.setHours(23, 59, 59, 999);
          break;
        case "yearly":
          currentPeriodStart = new Date(today.getFullYear(), 0, 1);
          currentPeriodEnd = new Date(
            today.getFullYear(),
            11,
            31,
            23,
            59,
            59,
            999,
          );
          break;
        case "custom":
          currentPeriodStart = new Date(customDateRange.startDate);
          currentPeriodEnd = new Date(customDateRange.endDate);
          currentPeriodEnd.setHours(23, 59, 59, 999);
          break;
        case "monthly":
        default:
          currentPeriodStart = new Date(
            today.getFullYear(),
            today.getMonth(),
            1,
          );
          currentPeriodEnd = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            0,
            23,
            59,
            59,
            999,
          );
          break;
      }

      const currentStartStr = currentPeriodStart.toISOString();
      const currentEndStr = currentPeriodEnd.toISOString();

      // Fetch outer product items (using is_outer_product flag)
      const { data: outerItems, error: outerError } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("is_outer_product", true)
        .gte("created_at", currentStartStr)
        .lte("created_at", currentEndStr);

      if (outerError) throw outerError;

      if (outerItems && outerItems.length > 0) {
        // Calculate income from outer products
        const income = outerItems.reduce((sum, item) => {
          return (
            sum +
            (Number(item.total_price) || 0) -
            (Number(item.discount_amount) || 0)
          );
        }, 0);

        // Calculate expenses using the stored buying_price
        const expenses = outerItems.reduce((sum, item) => {
          return (
            sum +
            (Number(item.buying_price) || 0) * (Number(item.quantity) || 0)
          );
        }, 0);

        const profit = income - expenses;

        setOuterProductStats({
          expenses,
          income,
          profit,
        });
      } else {
        setOuterProductStats({
          expenses: 0,
          income: 0,
          profit: 0,
        });
      }
    } catch (error) {
      console.error("Error fetching outer product stats:", error);
    }
  }

  async function fetchFinancialData() {
    try {
      setLoading(true);

      // Determine date ranges
      let currentPeriodStart: Date, currentPeriodEnd: Date;
      let previousPeriodStart: Date, previousPeriodEnd: Date;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      switch (timeFilter) {
        case "daily":
          currentPeriodStart = today;
          currentPeriodEnd = new Date(today);
          currentPeriodEnd.setHours(23, 59, 59, 999);
          previousPeriodStart = subDays(today, 1);
          previousPeriodEnd = new Date(previousPeriodStart);
          previousPeriodEnd.setHours(23, 59, 59, 999);
          break;
        case "yearly":
          currentPeriodStart = new Date(today.getFullYear(), 0, 1);
          currentPeriodEnd = new Date(
            today.getFullYear(),
            11,
            31,
            23,
            59,
            59,
            999,
          );
          previousPeriodStart = new Date(today.getFullYear() - 1, 0, 1);
          previousPeriodEnd = new Date(
            today.getFullYear() - 1,
            11,
            31,
            23,
            59,
            59,
            999,
          );
          break;
        case "custom":
          currentPeriodStart = new Date(customDateRange.startDate);
          currentPeriodEnd = new Date(customDateRange.endDate);
          currentPeriodEnd.setHours(23, 59, 59, 999);
          const rangeDuration =
            currentPeriodEnd.getTime() - currentPeriodStart.getTime();
          previousPeriodEnd = new Date(currentPeriodStart);
          previousPeriodEnd.setHours(0, 0, 0, 0);
          previousPeriodEnd.setTime(previousPeriodEnd.getTime() - 1);
          previousPeriodStart = new Date(previousPeriodEnd);
          previousPeriodStart.setTime(
            previousPeriodStart.getTime() - rangeDuration,
          );
          break;
        case "monthly":
        default:
          currentPeriodStart = new Date(
            today.getFullYear(),
            today.getMonth(),
            1,
          );
          currentPeriodEnd = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            0,
            23,
            59,
            59,
            999,
          );
          previousPeriodStart = new Date(
            today.getFullYear(),
            today.getMonth() - 1,
            1,
          );
          previousPeriodEnd = new Date(
            today.getFullYear(),
            today.getMonth(),
            0,
            23,
            59,
            59,
            999,
          );
          break;
      }

      const currentStartStr = currentPeriodStart.toISOString();
      const currentEndStr = currentPeriodEnd.toISOString();
      const prevStartStr = previousPeriodStart.toISOString();
      const prevEndStr = previousPeriodEnd.toISOString();

      // Fetch invoices and payments
      const { data: salesInvoices } = await supabase
        .from("invoices")
        .select("id, invoice_type, advance_payment")
        .eq("invoice_type", "sales")
        .gte("created_at", currentStartStr)
        .lte("created_at", currentEndStr);

      const { data: productInvoices } = await supabase
        .from("invoices")
        .select("id, invoice_type, advance_payment")
        .eq("invoice_type", "product_addition")
        .gte("created_at", currentStartStr)
        .lte("created_at", currentEndStr);

      const { data: currentPayments } = await supabase
        .from("payments")
        .select("invoice_id, amount, payment_date")
        .gte("payment_date", currentStartStr)
        .lte("payment_date", currentEndStr);

      const { data: prevSalesInvoices } = await supabase
        .from("invoices")
        .select("id, invoice_type, advance_payment")
        .eq("invoice_type", "sales")
        .gte("created_at", prevStartStr)
        .lte("created_at", prevEndStr);

      const { data: prevProductInvoices } = await supabase
        .from("invoices")
        .select("id, invoice_type, advance_payment")
        .eq("invoice_type", "product_addition")
        .gte("created_at", prevStartStr)
        .lte("created_at", prevEndStr);

      const { data: prevPayments } = await supabase
        .from("payments")
        .select("invoice_id, amount, payment_date")
        .gte("payment_date", prevStartStr)
        .lte("payment_date", prevEndStr);

      // Fetch expenses
      const { data: currentOthersCosts } = await supabase
        .from("others_costs")
        .select("amount")
        .gte("date", currentStartStr)
        .lte("date", currentEndStr);

      const { data: currentSalaries } = await supabase
        .from("salary_payments")
        .select("amount")
        .gte("payment_date", currentStartStr)
        .lte("payment_date", currentEndStr);

      const { data: prevOthersCosts } = await supabase
        .from("others_costs")
        .select("amount")
        .gte("date", prevStartStr)
        .lte("date", prevEndStr);

      const { data: prevSalaries } = await supabase
        .from("salary_payments")
        .select("amount")
        .gte("payment_date", prevStartStr)
        .lte("payment_date", prevEndStr);

      // Calculate Income
      const currentPaymentMap = (currentPayments || []).reduce(
        (acc, payment) => {
          acc[payment.invoice_id] =
            (acc[payment.invoice_id] || 0) + Number(payment.amount || 0);
          return acc;
        },
        {} as { [key: string]: number },
      );

      const prevPaymentMap = (prevPayments || []).reduce(
        (acc, payment) => {
          acc[payment.invoice_id] =
            (acc[payment.invoice_id] || 0) + Number(payment.amount || 0);
          return acc;
        },
        {} as { [key: string]: number },
      );

      // Get all invoice items for the current period
      const { data: currentInvoiceItems } = await supabase
        .from("invoice_items")
        .select(
          "invoice_id, total_price, discount_amount, is_outer_product, buying_price, quantity",
        )
        .gte("created_at", currentStartStr)
        .lte("created_at", currentEndStr);

      // Group invoice items by invoice_id and type (outer vs regular)
      const invoiceItemsMap = (currentInvoiceItems || []).reduce(
        (acc, item) => {
          if (!acc[item.invoice_id]) {
            acc[item.invoice_id] = {
              outer: [],
              regular: [],
            };
          }

          if (item.is_outer_product) {
            acc[item.invoice_id].outer.push(item);
          } else {
            acc[item.invoice_id].regular.push(item);
          }

          return acc;
        },
        {} as { [key: string]: { outer: any[]; regular: any[] } },
      );

      // Calculate income based on payments received
      let currentRegularIncome = 0;
      let currentOuterIncome = 0;

      // Process all sales invoices
      (salesInvoices || []).forEach((invoice) => {
        const advancePayment = Number(invoice.advance_payment || 0);
        const paymentsReceived = currentPaymentMap[invoice.id] || 0;
        const totalPaymentReceived = advancePayment + paymentsReceived;

        const invoiceItems = invoiceItemsMap[invoice.id] || {
          outer: [],
          regular: [],
        };

        // Calculate total invoice value
        const regularItemsTotal = invoiceItems.regular.reduce(
          (sum, item) => sum + (item.total_price - (item.discount_amount || 0)),
          0,
        );

        const outerItemsTotal = invoiceItems.outer.reduce(
          (sum, item) => sum + (item.total_price - (item.discount_amount || 0)),
          0,
        );

        const invoiceTotal = regularItemsTotal + outerItemsTotal;

        if (invoiceTotal <= 0) return; // Skip if invoice has no value

        // For regular products, only count advance payments in income
        if (regularItemsTotal > 0) {
          const regularProportion = regularItemsTotal / invoiceTotal;
          const regularAdvancePayment = advancePayment * regularProportion;
          currentRegularIncome += regularAdvancePayment;
        }

        // For outer products, ONLY count income when payment is received
        if (outerItemsTotal > 0 && totalPaymentReceived > 0) {
          // Calculate what portion of the payment should be allocated to outer products
          const outerProportion = outerItemsTotal / invoiceTotal;
          const outerPaymentShare = Math.min(
            outerItemsTotal,
            totalPaymentReceived * outerProportion,
          );
          currentOuterIncome += outerPaymentShare;
        }
      });

      const currentIncome = currentRegularIncome + currentOuterIncome;

      // Calculate previous period income using the same logic
      let prevRegularIncome = 0;
      let prevOuterIncome = 0;

      // Get previous period invoice items
      const { data: prevInvoiceItems } = await supabase
        .from("invoice_items")
        .select("invoice_id, total_price, discount_amount, is_outer_product")
        .gte("created_at", prevStartStr)
        .lte("created_at", prevEndStr);

      // Group previous period invoice items
      const prevInvoiceItemsMap = (prevInvoiceItems || []).reduce(
        (acc, item) => {
          if (!acc[item.invoice_id]) {
            acc[item.invoice_id] = {
              outer: [],
              regular: [],
            };
          }

          if (item.is_outer_product) {
            acc[item.invoice_id].outer.push(item);
          } else {
            acc[item.invoice_id].regular.push(item);
          }

          return acc;
        },
        {} as { [key: string]: { outer: any[]; regular: any[] } },
      );

      // Process previous sales invoices
      (prevSalesInvoices || []).forEach((invoice) => {
        const advancePayment = Number(invoice.advance_payment || 0);
        const paymentsReceived = prevPaymentMap[invoice.id] || 0;
        const totalPaymentReceived = advancePayment + paymentsReceived;

        const invoiceItems = prevInvoiceItemsMap[invoice.id] || {
          outer: [],
          regular: [],
        };

        // Calculate total invoice value
        const regularItemsTotal = invoiceItems.regular.reduce(
          (sum, item) => sum + (item.total_price - (item.discount_amount || 0)),
          0,
        );

        const outerItemsTotal = invoiceItems.outer.reduce(
          (sum, item) => sum + (item.total_price - (item.discount_amount || 0)),
          0,
        );

        const invoiceTotal = regularItemsTotal + outerItemsTotal;

        if (invoiceTotal <= 0) return; // Skip if invoice has no value

        // For regular products, only count advance payments in income
        if (regularItemsTotal > 0) {
          const regularProportion = regularItemsTotal / invoiceTotal;
          const regularAdvancePayment = advancePayment * regularProportion;
          prevRegularIncome += regularAdvancePayment;
        }

        // For outer products, ONLY count income when payment is received
        if (outerItemsTotal > 0 && totalPaymentReceived > 0) {
          // Calculate what portion of the payment should be allocated to outer products
          const outerProportion = outerItemsTotal / invoiceTotal;
          const outerPaymentShare = Math.min(
            outerItemsTotal,
            totalPaymentReceived * outerProportion,
          );
          prevOuterIncome += outerPaymentShare;
        }
      });

      const prevIncome = prevRegularIncome + prevOuterIncome;

      setDailyIncome(currentIncome);

      // Calculate Expenses
      const currentProductExpenses = (productInvoices || []).reduce(
        (sum, invoice) => {
          const paymentsMade = currentPaymentMap[invoice.id] || 0;
          const advance = Number(invoice.advance_payment || 0);
          return sum + paymentsMade + advance;
        },
        0,
      );

      // Include outer product costs in expenses
      const currentOuterProductExpenses = (currentInvoiceItems || []).reduce(
        (sum, item) => {
          if (item.is_outer_product) {
            return (
              sum + Number(item.buying_price || 0) * Number(item.quantity || 0)
            );
          }
          return sum;
        },
        0,
      );

      // Calculate other expenses
      const currentOthersExpenses = (currentOthersCosts || []).reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0,
      );

      const currentSalaryExpenses = (currentSalaries || []).reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0,
      );

      const totalCurrentExpenses =
        currentProductExpenses +
        currentOthersExpenses +
        currentSalaryExpenses +
        currentOuterProductExpenses;
      setTotalExpenses(totalCurrentExpenses);

      const prevProductExpenses = (prevProductInvoices || []).reduce(
        (sum, invoice) => {
          const paymentsMade = prevPaymentMap[invoice.id] || 0;
          const advance = Number(invoice.advance_payment || 0);
          return sum + paymentsMade + advance;
        },
        0,
      );

      // Include previous period outer product costs in expenses
      const prevOuterProductExpenses = (prevInvoiceItems || []).reduce(
        (sum, item) => {
          if (item.is_outer_product) {
            return (
              sum + Number(item.buying_price || 0) * Number(item.quantity || 0)
            );
          }
          return sum;
        },
        0,
      );

      const prevOthersExpenses = (prevOthersCosts || []).reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0,
      );

      const prevSalaryExpenses = (prevSalaries || []).reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0,
      );

      const totalPrevExpenses =
        prevProductExpenses +
        prevOthersExpenses +
        prevSalaryExpenses +
        prevOuterProductExpenses;

      // Calculate Net Earnings
      const currentNetEarnings = currentIncome - totalCurrentExpenses;
      setNetEarnings(currentNetEarnings);

      const prevNetEarnings = prevIncome - totalPrevExpenses;

      // Calculate Changes
      const calculateChange = (current: number, previous: number) => {
        if (previous === 0 && current > 0) {
          return { value: "100%", type: "increase" as const };
        } else if (previous === 0 && current < 0) {
          return { value: "100%", type: "decrease" as const };
        } else if (previous === 0) {
          return { value: "0%", type: "increase" as const };
        }
        const changePercent = ((current - previous) / Math.abs(previous)) * 100;
        return {
          value: `${Math.abs(changePercent).toFixed(1)}%`,
          type: changePercent >= 0 ? "increase" : ("decrease" as const),
        };
      };

      setIncomeChange(calculateChange(currentIncome, prevIncome));
      setExpensesChange(
        calculateChange(totalCurrentExpenses, totalPrevExpenses),
      );
      setEarningsChange(calculateChange(currentNetEarnings, prevNetEarnings));
    } catch (error) {
      console.error("Error fetching financial data:", error);
      toast({
        variant: "destructive",
        title: "Error fetching financial data",
        description:
          error instanceof Error ? error.message : JSON.stringify(error),
      });
    } finally {
      setLoading(false);
    }
  }

  const getTimeFilterDetails = () => {
    switch (timeFilter) {
      case "daily":
        return {
          incomeTitle: "Daily Income",
          expenseTitle: "Daily Expenses",
          earningsTitle: "Daily Net Earnings",
          advanceTitle: "Daily Advance Payments",
          description: "vs. yesterday",
        };
      case "monthly":
        return {
          incomeTitle: "Monthly Income",
          expenseTitle: "Monthly Expenses",
          earningsTitle: "Monthly Net Earnings",
          advanceTitle: "Monthly Advance Payments",
          description: "vs. last month",
        };
      case "yearly":
        return {
          incomeTitle: "Yearly Income",
          expenseTitle: "Yearly Expenses",
          earningsTitle: "Yearly Net Earnings",
          advanceTitle: "Yearly Advance Payments",
          description: "vs. last year",
        };
      case "custom":
        return {
          incomeTitle: "Custom Period Income",
          expenseTitle: "Custom Period Expenses",
          earningsTitle: "Custom Period Net Earnings",
          advanceTitle: "Custom Period Advance Payments",
          description: "vs. previous period",
        };
      default:
        return {
          incomeTitle: "Income",
          expenseTitle: "Expenses",
          earningsTitle: "Net Earnings",
          advanceTitle: "Advance Payments",
          description: "period comparison",
        };
    }
  };

  const {
    incomeTitle,
    expenseTitle,
    earningsTitle,
    advanceTitle,
    description,
  } = getTimeFilterDetails();

  const stats = [
    {
      title: incomeTitle,
      value: `$${dailyIncome.toFixed(2)}`,
      change: incomeChange,
      description: description,
      icon: <DollarSign className="h-6 w-6 text-green-600" />,
    },
    {
      title: expenseTitle,
      value: `$${totalExpenses.toFixed(2)}`,
      change: expensesChange,
      description: description,
      icon: <TrendingDown className="h-6 w-6 text-red-600" />,
    },
    {
      title: earningsTitle,
      value: `$${netEarnings.toFixed(2)}`,
      change: earningsChange,
      description: description,
      icon: <Wallet className="h-6 w-6 text-blue-600" />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-2">
        <h2 className="text-lg font-medium">Financial Overview</h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-2 w-full sm:w-auto">
          <Select
            value={timeFilter}
            onValueChange={(value: "daily" | "monthly" | "yearly" | "custom") =>
              setTimeFilter(value)
            }
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          {timeFilter === "custom" && (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 w-full sm:w-auto">
              <div className="w-full sm:w-auto">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={customDateRange.startDate}
                  onChange={(e) =>
                    setCustomDateRange({
                      ...customDateRange,
                      startDate: e.target.value,
                    })
                  }
                />
              </div>
              <div className="w-full sm:w-auto">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={customDateRange.endDate}
                  onChange={(e) =>
                    setCustomDateRange({
                      ...customDateRange,
                      endDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Combined Stats (Regular + Outer Products) */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg shadow border border-blue-100">
        <h3 className="text-lg font-medium mb-3 text-blue-800">
          Combined Financial Summary
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Separate figures for regular and outer products
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-white border-blue-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-blue-800">
                Regular Products Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">
                ${dailyIncome.toFixed(2)}
              </div>
              <div className="mt-1 flex items-center text-sm">
                {incomeChange.type === "increase" ? (
                  <ArrowUp className="mr-1 h-4 w-4 text-green-600" />
                ) : (
                  <ArrowDown className="mr-1 h-4 w-4 text-red-600" />
                )}
                <span
                  className={
                    incomeChange.type === "increase"
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {incomeChange.value}
                </span>
                <span className="ml-1 text-gray-500">{description}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-blue-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-blue-800">
                Regular Products Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">
                ${totalExpenses.toFixed(2)}
              </div>
              <div className="mt-1 flex items-center text-sm">
                {expensesChange.type === "increase" ? (
                  <ArrowUp className="mr-1 h-4 w-4 text-red-600" />
                ) : (
                  <ArrowDown className="mr-1 h-4 w-4 text-green-600" />
                )}
                <span
                  className={
                    expensesChange.type === "increase"
                      ? "text-red-600"
                      : "text-green-600"
                  }
                >
                  {expensesChange.value}
                </span>
                <span className="ml-1 text-gray-500">{description}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-blue-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-blue-800">
                Regular Products Net Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${netEarnings.toFixed(2)}
              </div>
              <div className="mt-1 flex items-center text-sm">
                {earningsChange.type === "increase" ? (
                  <ArrowUp className="mr-1 h-4 w-4 text-green-600" />
                ) : (
                  <ArrowDown className="mr-1 h-4 w-4 text-red-600" />
                )}
                <span
                  className={
                    earningsChange.type === "increase"
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {earningsChange.value}
                </span>
                <span className="ml-1 text-gray-500">{description}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Separate Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Regular Products */}
        <div className="p-4 bg-gray-50 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-medium mb-3 text-gray-800">
            Regular Products
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {stats.map((stat, index) => (
              <Stat
                key={index}
                title={stat.title}
                value={stat.value}
                change={stat.change}
                description={stat.description}
                icon={stat.icon}
                loading={loading}
              />
            ))}
          </div>
        </div>

        {/* Outer Products */}
        <div className="p-4 bg-blue-50 rounded-lg shadow border border-blue-100">
          <h3 className="text-lg font-medium mb-3 text-blue-800">
            Outer Products
          </h3>
          <div className="text-sm text-blue-600 mb-3">
            Note: Outer product costs are now included in the total expenses
            calculation.
          </div>
          <div className="grid grid-cols-1 gap-3">
            <Card className="bg-white border-blue-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-blue-800">
                  Income
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900">
                  ${outerProductStats.income.toFixed(2)}
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  Total outer product sales
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-blue-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-blue-800">
                  Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900">
                  ${outerProductStats.expenses.toFixed(2)}
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  Total outer product costs
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-blue-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-blue-800">
                  Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ${outerProductStats.profit.toFixed(2)}
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  Net profit from outer products
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Bar Chart for Income, Expenses, Net Profit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <a href="/dashboard/customers?filter=credits" className="block">
          <Card className="bg-white hover:shadow-md transition-all duration-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                View Customer Credits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                View all customers with outstanding credits
              </p>
            </CardContent>
          </Card>
        </a>

        <a href="/dashboard/suppliers?filter=dues" className="block">
          <Card className="bg-white hover:shadow-md transition-all duration-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Store className="h-4 w-4 text-purple-600" />
                View Supplier Dues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                View all suppliers with pending payments
              </p>
            </CardContent>
          </Card>
        </a>
      </div>

      <div className="mt-6 p-3 sm:p-4 bg-white rounded-lg shadow">
        <h3 className="text-lg font-medium mb-3 sm:mb-4">Financial Metrics</h3>
        <div className="h-48 sm:h-64 flex items-end justify-around">
          {/* Income Bar */}
          <div className="flex flex-col items-center">
            <div
              className="w-16 sm:w-24 bg-green-500 rounded-t-md transition-all duration-500"
              style={{
                height: `${(dailyIncome / Math.max(dailyIncome, totalExpenses, Math.abs(netEarnings))) * 180 || 0}px`,
              }}
            ></div>
            <div className="mt-2 text-center">
              <p className="text-sm sm:text-base font-medium">Income</p>
              <p className="text-xs sm:text-sm text-gray-500">
                ${dailyIncome.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Expenses Bar */}
          <div className="flex flex-col items-center">
            <div
              className="w-16 sm:w-24 bg-red-500 rounded-t-md transition-all duration-500"
              style={{
                height: `${(totalExpenses / Math.max(dailyIncome, totalExpenses, Math.abs(netEarnings))) * 180 || 0}px`,
              }}
            ></div>
            <div className="mt-2 text-center">
              <p className="text-sm sm:text-base font-medium">Expenses</p>
              <p className="text-xs sm:text-sm text-gray-500">
                ${totalExpenses.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Net Profit Bar */}
          <div className="flex flex-col items-center">
            <div
              className={`w-16 sm:w-24 ${netEarnings >= 0 ? "bg-blue-500" : "bg-orange-500"} rounded-t-md transition-all duration-500`}
              style={{
                height: `${(Math.abs(netEarnings) / Math.max(dailyIncome, totalExpenses, Math.abs(netEarnings))) * 180 || 0}px`,
              }}
            ></div>
            <div className="mt-2 text-center">
              <p className="text-sm sm:text-base font-medium">Net Profit</p>
              <p
                className={`text-xs sm:text-sm ${netEarnings >= 0 ? "text-blue-500" : "text-orange-500"}`}
              >
                ${netEarnings.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
        <p className="font-medium text-gray-700 mb-1">About Outer Products</p>
        <p>
          Outer products are items that are only sold by the admin, not bought
          and sold like regular products. The expenses and income for outer
          products are calculated separately from regular inventory items.
        </p>
      </div>
    </div>
  );
}

// Add default export for the RevenueStats component
export default RevenueStats;
