import { useState, useEffect } from "react";
import { supabase } from "../../../../supabase/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowUpRight, TrendingUp, Calendar } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SalesSummary() {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState({
    total: "$0.00",
    increase: "0%",
    period: "vs. last month",
  });
  const [timeFrame, setTimeFrame] = useState<"monthly" | "yearly">("monthly");
  const [monthlyData, setMonthlyData] = useState<number[]>([
    0, 0, 0, 0, 0, 0, 0,
  ]);
  const [yearlyData, setYearlyData] = useState<number[]>([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ]);

  useEffect(() => {
    fetchSalesData();

    // Set up realtime subscription for invoice_items and salary_payments tables
    const invoiceSubscription = supabase
      .channel("invoice_items_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invoice_items" },
        () => fetchSalesData(),
      )
      .subscribe();

    const salarySubscription = supabase
      .channel("salary_payments_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "salary_payments" },
        () => fetchSalesData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(invoiceSubscription);
      supabase.removeChannel(salarySubscription);
    };
  }, [timeFrame]);

  async function fetchSalesData() {
    try {
      setLoading(true);

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      // For monthly view - get last 7 days
      if (timeFrame === "monthly") {
        const dailyTotals: number[] = [];

        // Get data for the last 7 days
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);

          const nextDate = new Date(date);
          nextDate.setDate(nextDate.getDate() + 1);

          // Get paid or partially paid invoices for this day
          const { data: dayInvoices, error: invoicesError } = await supabase
            .from("invoices")
            .select("id, status, advance_payment, total_amount")
            .in("status", ["paid", "partially_paid"])
            .gte("created_at", date.toISOString())
            .lt("created_at", nextDate.toISOString());

          if (invoicesError) throw invoicesError;

          // Calculate day total - only count paid amounts
          const dayTotal = dayInvoices.reduce((sum, invoice) => {
            if (invoice.status === "paid") {
              return sum + Number(invoice.total_amount);
            } else {
              return sum + Number(invoice.advance_payment);
            }
          }, 0);

          dailyTotals.push(dayTotal);
        }

        setMonthlyData(dailyTotals);

        // Fetch current month's invoices that are paid or partially paid
        const currentMonthStart = new Date(currentYear, currentMonth, 1);
        const currentMonthEnd = new Date(
          currentYear,
          currentMonth + 1,
          0,
          23,
          59,
          59,
        );

        const { data: currentMonthInvoices, error: currentMonthInvoicesError } =
          await supabase
            .from("invoices")
            .select("id, status, advance_payment, total_amount")
            .in("status", ["paid", "partially_paid"])
            .gte("created_at", currentMonthStart.toISOString())
            .lte("created_at", currentMonthEnd.toISOString());

        if (currentMonthInvoicesError) throw currentMonthInvoicesError;

        // Calculate current month total - only count paid amounts
        const currentMonthTotal = currentMonthInvoices.reduce(
          (sum, invoice) => {
            if (invoice.status === "paid") {
              return sum + Number(invoice.total_amount);
            } else {
              return sum + Number(invoice.advance_payment);
            }
          },
          0,
        );

        // Calculate previous month total
        const prevMonthStart = new Date(currentYear, currentMonth - 1, 1);
        const prevMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59);

        const { data: prevMonthInvoices, error: prevMonthInvoicesError } =
          await supabase
            .from("invoices")
            .select("id, status, advance_payment, total_amount")
            .in("status", ["paid", "partially_paid"])
            .gte("created_at", prevMonthStart.toISOString())
            .lte("created_at", prevMonthEnd.toISOString());

        if (prevMonthInvoicesError) throw prevMonthInvoicesError;

        // Calculate previous month total - only count paid amounts
        const prevMonthTotal = prevMonthInvoices.reduce((sum, invoice) => {
          if (invoice.status === "paid") {
            return sum + Number(invoice.total_amount);
          } else {
            return sum + Number(invoice.advance_payment);
          }
        }, 0);

        // Calculate percentage increase/decrease
        let percentChange = 0;
        if (prevMonthTotal > 0) {
          percentChange =
            ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100;
        }

        setSalesData({
          total: `$${currentMonthTotal.toFixed(2)}`,
          increase: `${Math.abs(percentChange).toFixed(1)}%`,
          period: "vs. last month",
        });
      }
      // For yearly view - get all months in current year
      else {
        const monthlyTotals: number[] = [];

        // Get data for each month in the current year
        for (let month = 0; month < 12; month++) {
          const monthStart = new Date(currentYear, month, 1);
          const monthEnd = new Date(currentYear, month + 1, 0, 23, 59, 59);

          // Get paid or partially paid invoices for this month
          const { data: monthInvoices, error } = await supabase
            .from("invoices")
            .select("id, status, advance_payment, total_amount")
            .in("status", ["paid", "partially_paid"])
            .gte("created_at", monthStart.toISOString())
            .lte("created_at", monthEnd.toISOString());

          if (error) throw error;

          // Calculate month total - only count paid amounts
          const monthTotal = monthInvoices.reduce((sum, invoice) => {
            if (invoice.status === "paid") {
              return sum + Number(invoice.total_amount);
            } else {
              return sum + Number(invoice.advance_payment);
            }
          }, 0);

          monthlyTotals.push(monthTotal);
        }

        setYearlyData(monthlyTotals);

        // Calculate current year total
        const currentYearStart = new Date(currentYear, 0, 1);
        const currentYearEnd = new Date(currentYear, 11, 31, 23, 59, 59);

        const { data: currentYearInvoices, error: currentYearError } =
          await supabase
            .from("invoices")
            .select("id, status, advance_payment, total_amount")
            .in("status", ["paid", "partially_paid"])
            .gte("created_at", currentYearStart.toISOString())
            .lte("created_at", currentYearEnd.toISOString());

        if (currentYearError) throw currentYearError;

        // Calculate current year total - only count paid amounts
        const currentYearTotal = currentYearInvoices.reduce((sum, invoice) => {
          if (invoice.status === "paid") {
            return sum + Number(invoice.total_amount);
          } else {
            return sum + Number(invoice.advance_payment);
          }
        }, 0);

        // Calculate previous year total
        const prevYearStart = new Date(currentYear - 1, 0, 1);
        const prevYearEnd = new Date(currentYear - 1, 11, 31, 23, 59, 59);

        const { data: prevYearInvoices, error: prevYearError } = await supabase
          .from("invoices")
          .select("id, status, advance_payment, total_amount")
          .in("status", ["paid", "partially_paid"])
          .gte("created_at", prevYearStart.toISOString())
          .lte("created_at", prevYearEnd.toISOString());

        if (prevYearError) throw prevYearError;

        // Calculate previous year total - only count paid amounts
        const prevYearTotal = prevYearInvoices.reduce((sum, invoice) => {
          if (invoice.status === "paid") {
            return sum + Number(invoice.total_amount);
          } else {
            return sum + Number(invoice.advance_payment);
          }
        }, 0);

        // Calculate percentage increase/decrease
        let percentChange = 0;
        if (prevYearTotal > 0) {
          percentChange =
            ((currentYearTotal - prevYearTotal) / prevYearTotal) * 100;
        }

        setSalesData({
          total: `$${currentYearTotal.toFixed(2)}`,
          increase: `${Math.abs(percentChange).toFixed(1)}%`,
          period: "vs. last year",
        });
      }
    } catch (error) {
      console.error("Error fetching sales data:", error);
      toast({
        variant: "destructive",
        title: "Error fetching sales data",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  // Get the appropriate data based on the selected time frame
  const chartData = timeFrame === "monthly" ? monthlyData : yearlyData;

  // Find the maximum value for scaling
  const maxValue = Math.max(...chartData, 1); // Ensure at least 1 to avoid division by zero

  // Get labels based on time frame
  const getLabels = () => {
    if (timeFrame === "monthly") {
      // Get the last 7 days as labels
      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.getDate().toString();
      });
    } else {
      // Return month abbreviations
      return [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
    }
  };

  const labels = getLabels();

  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium">Sales Summary</CardTitle>
          <CardDescription>
            {timeFrame === "monthly" ? "Monthly" : "Yearly"} revenue overview
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={timeFrame}
            onValueChange={(value) =>
              setTimeFrame(value as "monthly" | "yearly")
            }
          >
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue placeholder="Time Frame" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <div className="h-10 w-10 rounded-full bg-blue-50 p-2">
            <TrendingUp className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-8 w-32 bg-gray-200 rounded"></div>
            <div className="h-4 w-48 bg-gray-200 rounded"></div>
            <div className="mt-4 h-[80px] w-full bg-gray-100 rounded-md"></div>
          </div>
        ) : (
          <>
            <div className="text-3xl font-bold">{salesData.total}</div>
            <div className="mt-1 flex items-center text-sm text-green-600">
              <ArrowUpRight className="mr-1 h-4 w-4" />
              <span>{salesData.increase}</span>
              <span className="ml-1 text-gray-500">{salesData.period}</span>
            </div>
            <div className="mt-4 h-[120px] w-full bg-gradient-to-r from-blue-50 to-blue-100 rounded-md flex items-end">
              <div className="flex w-full justify-between px-2 pb-2">
                {chartData.map((value, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div
                      className="w-8 bg-blue-500 rounded-t-sm transition-all duration-500 ease-in-out"
                      style={{ height: `${(value / maxValue) * 100}%` }}
                    />
                    <div className="text-xs mt-1 text-gray-600">
                      {labels[i]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
