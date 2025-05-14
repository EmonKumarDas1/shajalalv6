import { useState, useEffect } from "react";
import { supabase } from "../../../../supabase/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";
import { ArrowUpRight, ArrowDownRight, DollarSign } from "lucide-react";

type SalesData = {
  period: string;
  total: number;
  count: number;
};

export function SalesIncomeStats() {
  const [salesData, setSalesData] = useState<{
    daily: SalesData[];
    monthly: SalesData[];
    yearly: SalesData[];
  }>({ daily: [], monthly: [], yearly: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("daily");
  const [totalIncome, setTotalIncome] = useState(0);
  const [percentChange, setPercentChange] = useState(0);
  const [isPositiveChange, setIsPositiveChange] = useState(true);

  useEffect(() => {
    fetchSalesData();
  }, []);

  useEffect(() => {
    // Update the displayed total and percent change when tab changes
    updateDisplayedStats();
  }, [activeTab, salesData]);

  async function fetchSalesData() {
    try {
      setLoading(true);

      // Get current date ranges
      const today = new Date();
      const yesterday = subDays(today, 1);
      const currentMonthStart = startOfMonth(today);
      const currentMonthEnd = endOfMonth(today);
      const lastMonthStart = startOfMonth(subDays(currentMonthStart, 1));
      const lastMonthEnd = endOfMonth(subDays(currentMonthStart, 1));
      const currentYearStart = startOfYear(today);
      const currentYearEnd = endOfYear(today);
      const lastYearStart = startOfYear(subDays(currentYearStart, 1));
      const lastYearEnd = endOfYear(subDays(currentYearStart, 1));

      // Fetch daily data (last 7 days)
      const dailyData = [];
      for (let i = 0; i < 7; i++) {
        const date = subDays(today, i);
        const startDate = format(date, "yyyy-MM-dd");
        const endDate = format(date, "yyyy-MM-dd 23:59:59");

        const { data, error } = await supabase
          .from("invoices")
          .select("advance_payment, created_at")
          .gte("created_at", startDate)
          .lte("created_at", endDate);

        if (error) throw error;

        const total =
          data?.reduce(
            (sum, invoice) => sum + (invoice.advance_payment || 0),
            0,
          ) || 0;

        dailyData.push({
          period: format(date, "MMM dd"),
          total,
          count: data?.length || 0,
        });
      }

      // Fetch monthly data (last 6 months)
      const monthlyData = [];
      for (let i = 0; i < 6; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthStart = format(startOfMonth(date), "yyyy-MM-dd");
        const monthEnd = format(endOfMonth(date), "yyyy-MM-dd 23:59:59");

        const { data, error } = await supabase
          .from("invoices")
          .select("advance_payment, created_at")
          .gte("created_at", monthStart)
          .lte("created_at", monthEnd);

        if (error) throw error;

        const total =
          data?.reduce(
            (sum, invoice) => sum + (invoice.advance_payment || 0),
            0,
          ) || 0;

        monthlyData.push({
          period: format(date, "MMM yyyy"),
          total,
          count: data?.length || 0,
        });
      }

      // Fetch yearly data (last 3 years)
      const yearlyData = [];
      for (let i = 0; i < 3; i++) {
        const date = new Date(today.getFullYear() - i, 0, 1);
        const yearStart = format(startOfYear(date), "yyyy-MM-dd");
        const yearEnd = format(endOfYear(date), "yyyy-MM-dd 23:59:59");

        const { data, error } = await supabase
          .from("invoices")
          .select("advance_payment, created_at")
          .gte("created_at", yearStart)
          .lte("created_at", yearEnd);

        if (error) throw error;

        const total =
          data?.reduce(
            (sum, invoice) => sum + (invoice.advance_payment || 0),
            0,
          ) || 0;

        yearlyData.push({
          period: format(date, "yyyy"),
          total,
          count: data?.length || 0,
        });
      }

      setSalesData({
        daily: dailyData.reverse(),
        monthly: monthlyData.reverse(),
        yearly: yearlyData.reverse(),
      });
    } catch (error) {
      console.error("Error fetching sales data:", error);
    } finally {
      setLoading(false);
    }
  }

  const updateDisplayedStats = () => {
    const data = salesData[activeTab as keyof typeof salesData];
    if (!data || data.length < 2) return;

    // Current period is the most recent one
    const currentPeriodTotal = data[data.length - 1].total;
    setTotalIncome(currentPeriodTotal);

    // Previous period is the second most recent one
    const previousPeriodTotal = data[data.length - 2].total;

    // Calculate percent change
    if (previousPeriodTotal > 0) {
      const change =
        ((currentPeriodTotal - previousPeriodTotal) / previousPeriodTotal) *
        100;
      setPercentChange(Math.abs(change));
      setIsPositiveChange(change >= 0);
    } else {
      setPercentChange(currentPeriodTotal > 0 ? 100 : 0);
      setIsPositiveChange(currentPeriodTotal > 0);
    }
  };

  const renderBarChart = (data: SalesData[]) => {
    if (!data || data.length === 0) return null;

    // Find the maximum value to scale the bars
    const maxValue = Math.max(...data.map((item) => item.total));

    return (
      <div className="mt-4">
        <div className="flex items-end gap-2 h-40">
          {data.map((item, index) => {
            const height = maxValue > 0 ? (item.total / maxValue) * 100 : 0;
            return (
              <div key={index} className="flex flex-col items-center flex-1">
                <div className="relative w-full">
                  <div
                    className="w-full bg-blue-100 rounded-t"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  >
                    <div className="absolute bottom-0 w-full h-full bg-blue-500 bg-opacity-20 rounded-t"></div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1 truncate w-full text-center">
                  {item.period}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500">{data[0].period}</div>
          <div className="text-sm text-gray-500">
            {data[data.length - 1].period}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Sales Income</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  ${totalIncome.toFixed(2)}
                </div>
                <div className="flex items-center mt-1">
                  {isPositiveChange ? (
                    <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span
                    className={
                      isPositiveChange ? "text-green-500" : "text-red-500"
                    }
                  >
                    {percentChange.toFixed(1)}%
                  </span>
                  <span className="text-gray-500 text-sm ml-1">
                    vs previous{" "}
                    {activeTab === "daily"
                      ? "day"
                      : activeTab === "monthly"
                        ? "month"
                        : "year"}
                  </span>
                </div>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="mt-4"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">Yearly</TabsTrigger>
              </TabsList>
              <TabsContent value="daily">
                {renderBarChart(salesData.daily)}
              </TabsContent>
              <TabsContent value="monthly">
                {renderBarChart(salesData.monthly)}
              </TabsContent>
              <TabsContent value="yearly">
                {renderBarChart(salesData.yearly)}
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  );
}
