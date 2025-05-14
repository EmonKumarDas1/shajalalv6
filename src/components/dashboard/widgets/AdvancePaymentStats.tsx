import { useState, useEffect } from "react";
import { supabase } from "../../../../supabase/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";
import { DollarSign } from "lucide-react";

export function AdvancePaymentStats() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    today: 0,
    thisMonth: 0,
    thisYear: 0,
    total: 0,
  });

  useEffect(() => {
    fetchAdvancePaymentStats();
  }, []);

  async function fetchAdvancePaymentStats() {
    try {
      setLoading(true);

      // Get current date ranges
      const today = new Date();
      const todayStart = format(today, "yyyy-MM-dd");
      const todayEnd = format(today, "yyyy-MM-dd 23:59:59");

      const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(today), "yyyy-MM-dd 23:59:59");

      const yearStart = format(startOfYear(today), "yyyy-MM-dd");
      const yearEnd = format(endOfYear(today), "yyyy-MM-dd 23:59:59");

      // Fetch today's advance payments
      const { data: todayData, error: todayError } = await supabase
        .from("invoices")
        .select("advance_payment")
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd);

      if (todayError) throw todayError;

      // Fetch this month's advance payments
      const { data: monthData, error: monthError } = await supabase
        .from("invoices")
        .select("advance_payment")
        .gte("created_at", monthStart)
        .lte("created_at", monthEnd);

      if (monthError) throw monthError;

      // Fetch this year's advance payments
      const { data: yearData, error: yearError } = await supabase
        .from("invoices")
        .select("advance_payment")
        .gte("created_at", yearStart)
        .lte("created_at", yearEnd);

      if (yearError) throw yearError;

      // Fetch all-time advance payments
      const { data: totalData, error: totalError } = await supabase
        .from("invoices")
        .select("advance_payment");

      if (totalError) throw totalError;

      // Calculate totals
      const todayTotal =
        todayData?.reduce(
          (sum, invoice) => sum + (invoice.advance_payment || 0),
          0,
        ) || 0;
      const monthTotal =
        monthData?.reduce(
          (sum, invoice) => sum + (invoice.advance_payment || 0),
          0,
        ) || 0;
      const yearTotal =
        yearData?.reduce(
          (sum, invoice) => sum + (invoice.advance_payment || 0),
          0,
        ) || 0;
      const allTimeTotal =
        totalData?.reduce(
          (sum, invoice) => sum + (invoice.advance_payment || 0),
          0,
        ) || 0;

      setStats({
        today: todayTotal,
        thisMonth: monthTotal,
        thisYear: yearTotal,
        total: allTimeTotal,
      });
    } catch (error) {
      console.error("Error fetching advance payment stats:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">
          Total Advance Payments
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  ${stats.total.toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">
                  All-time advance payments
                </div>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Today</p>
                <p className="text-lg font-semibold">
                  ${stats.today.toFixed(2)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">This Month</p>
                <p className="text-lg font-semibold">
                  ${stats.thisMonth.toFixed(2)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">This Year</p>
                <p className="text-lg font-semibold">
                  ${stats.thisYear.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
