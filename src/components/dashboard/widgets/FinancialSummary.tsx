import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "../../../../supabase/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  TrendingUp,
} from "lucide-react";

interface FinancialData {
  totalSales: number;
  totalCosts: number;
  totalProfit: number;
  totalOuterSales: number;
  totalOuterCosts: number;
  totalOuterProfit: number;
  totalRegularSales: number;
  totalRegularCosts: number;
  totalRegularProfit: number;
  pendingPayments: number;
  receivedPayments: number;
}

export function FinancialSummary() {
  const [financialData, setFinancialData] = useState<FinancialData>({
    totalSales: 0,
    totalCosts: 0,
    totalProfit: 0,
    totalOuterSales: 0,
    totalOuterCosts: 0,
    totalOuterProfit: 0,
    totalRegularSales: 0,
    totalRegularCosts: 0,
    totalRegularProfit: 0,
    pendingPayments: 0,
    receivedPayments: 0,
  });
  const [timeframe, setTimeframe] = useState<
    "today" | "week" | "month" | "all"
  >("month");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFinancialData();
  }, [timeframe]);

  const fetchFinancialData = async () => {
    setIsLoading(true);
    try {
      // Get date range based on timeframe
      let startDate = new Date();
      if (timeframe === "today") {
        startDate.setHours(0, 0, 0, 0);
      } else if (timeframe === "week") {
        startDate.setDate(startDate.getDate() - 7);
      } else if (timeframe === "month") {
        startDate.setMonth(startDate.getMonth() - 1);
      } else {
        // All time - no filter
        startDate = new Date(0); // January 1, 1970
      }

      const startDateStr = startDate.toISOString();

      // Get all invoices for the period
      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select("*")
        .gte("created_at", startDateStr);

      if (invoicesError) throw invoicesError;

      // Get all invoice items for the period
      const { data: invoiceItems, error: invoiceItemsError } = await supabase
        .from("invoice_items")
        .select("*")
        .gte("created_at", startDateStr);

      if (invoiceItemsError) throw invoiceItemsError;

      // Get all payments for the period
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .gte("payment_date", startDateStr);

      if (paymentsError) throw paymentsError;

      // Create a map of invoice_id to total payments received (including advance payments)
      const paymentsByInvoice = {};

      // First add advance payments from invoices
      (invoices || []).forEach((invoice) => {
        paymentsByInvoice[invoice.id] = Number(invoice.advance_payment || 0);
      });

      // Then add additional payments
      (payments || []).forEach((payment) => {
        if (payment.invoice_id) {
          paymentsByInvoice[payment.invoice_id] =
            (paymentsByInvoice[payment.invoice_id] || 0) +
            Number(payment.amount || 0);
        }
      });

      // Group invoice items by invoice_id
      const invoiceItemsByInvoice = {};
      (invoiceItems || []).forEach((item) => {
        if (!invoiceItemsByInvoice[item.invoice_id]) {
          invoiceItemsByInvoice[item.invoice_id] = [];
        }
        invoiceItemsByInvoice[item.invoice_id].push(item);
      });

      // Initialize financial metrics
      let totalRegularSales = 0;
      let totalRegularCosts = 0;
      let totalOuterSales = 0;
      let totalOuterCosts = 0;
      let pendingPayments = 0;
      let receivedPayments = 0;

      // Process each invoice
      (invoices || []).forEach((invoice) => {
        const invoiceId = invoice.id;
        const items = invoiceItemsByInvoice[invoiceId] || [];
        const totalPaymentReceived = paymentsByInvoice[invoiceId] || 0;

        // Track received vs pending payments
        receivedPayments += totalPaymentReceived;

        // Calculate total invoice value and separate regular vs outer products
        let regularItemsTotal = 0;
        let outerItemsTotal = 0;
        let regularItemsCost = 0;
        let outerItemsCost = 0;

        items.forEach((item) => {
          const itemTotal = item.total_price - (item.discount_amount || 0);
          const itemCost = item.buying_price * item.quantity;

          if (item.is_outer_product) {
            outerItemsTotal += itemTotal;
            outerItemsCost += itemCost;
          } else {
            regularItemsTotal += itemTotal;
            regularItemsCost += itemCost;
          }
        });

        // For pending payments, only include regular product amounts that haven't been paid yet
        // Do NOT include outer products in pending payments calculation
        pendingPayments += Math.max(
          0,
          invoice.total_amount - outerItemsTotal - totalPaymentReceived,
        );

        // Skip if no payment received
        if (totalPaymentReceived <= 0) return;

        const invoiceTotal = regularItemsTotal + outerItemsTotal;

        // Skip if invoice has no value
        if (invoiceTotal <= 0) return;

        // Calculate payment ratio - how much of the invoice has been paid
        const paymentRatio = Math.min(
          1,
          totalPaymentReceived / invoice.total_amount,
        );

        // For regular products, only count advance payments in income
        if (regularItemsTotal > 0) {
          // Only count advance payments for regular products
          const regularProportion = regularItemsTotal / invoiceTotal;
          const regularAdvancePayment =
            Number(invoice.advance_payment || 0) * regularProportion;
          totalRegularSales += regularAdvancePayment;
          totalRegularCosts +=
            regularItemsCost * (regularAdvancePayment / regularItemsTotal);
        }

        // For outer products, ONLY count income when payment is received
        if (outerItemsTotal > 0 && totalPaymentReceived > 0) {
          const outerProportion = outerItemsTotal / invoiceTotal;
          const outerPaymentShare = totalPaymentReceived * outerProportion;
          totalOuterSales += outerPaymentShare;
          totalOuterCosts += outerItemsCost * paymentRatio;
        }
      });

      // Calculate totals and profits
      const totalSales = totalRegularSales + totalOuterSales;
      const totalCosts = totalRegularCosts + totalOuterCosts;
      const totalProfit = totalSales - totalCosts;
      const totalRegularProfit = totalRegularSales - totalRegularCosts;
      const totalOuterProfit = totalOuterSales - totalOuterCosts;

      setFinancialData({
        totalSales,
        totalCosts,
        totalProfit,
        totalOuterSales,
        totalOuterCosts,
        totalOuterProfit,
        totalRegularSales,
        totalRegularCosts,
        totalRegularProfit,
        pendingPayments,
        receivedPayments,
      });
    } catch (error) {
      console.error("Error fetching financial data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold">Financial Summary</CardTitle>
        <Tabs
          value={timeframe}
          onValueChange={(v) => setTimeframe(v as typeof timeframe)}
          className="w-[400px]"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Overall Financial Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between space-x-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Total Sales
                      </p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(financialData.totalRegularSales)}
                      </p>
                    </div>
                    <div className="p-2 bg-green-100 rounded-full">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 border-green-200"
                    >
                      <ArrowUpRight className="w-3 h-3 mr-1" />
                      Regular Products Revenue
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between space-x-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Total Costs
                      </p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(financialData.totalCosts)}
                      </p>
                    </div>
                    <div className="p-2 bg-red-100 rounded-full">
                      <ArrowDownRight className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <Badge
                      variant="outline"
                      className="bg-red-50 text-red-700 border-red-200"
                    >
                      <ArrowDownRight className="w-3 h-3 mr-1" />
                      Expenses
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between space-x-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Total Profit
                      </p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(financialData.totalProfit)}
                      </p>
                    </div>
                    <div className="p-2 bg-blue-100 rounded-full">
                      <TrendingUp className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <Badge
                      variant="outline"
                      className={`${financialData.totalProfit >= 0 ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-red-50 text-red-700 border-red-200"}`}
                    >
                      {financialData.totalProfit >= 0 ? (
                        <ArrowUpRight className="w-3 h-3 mr-1" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3 mr-1" />
                      )}
                      {financialData.totalProfit >= 0 ? "Profit" : "Loss"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Breakdown */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="regular">Regular Products</TabsTrigger>
                <TabsTrigger value="outer">Outer Products</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-medium mb-4">
                        Payment Status
                      </h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">
                            Received Payments
                          </span>
                          <span className="font-medium text-green-600">
                            {formatCurrency(financialData.receivedPayments)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">
                            Pending Payments
                          </span>
                          <span className="font-medium text-amber-600">
                            {formatCurrency(financialData.pendingPayments)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="font-medium">Total</span>
                          <span className="font-medium">
                            {formatCurrency(
                              financialData.receivedPayments +
                                financialData.pendingPayments,
                            )}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-medium mb-4">
                        Product Type Breakdown
                      </h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">
                            Regular Products Revenue
                          </span>
                          <span className="font-medium">
                            {formatCurrency(financialData.totalRegularSales)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">
                            Outer Products Revenue
                          </span>
                          <span className="font-medium">
                            {formatCurrency(financialData.totalOuterSales)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="font-medium">Total Revenue</span>
                          <span className="font-medium">
                            {formatCurrency(financialData.totalSales)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="regular" className="mt-4">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-medium mb-4">
                      Regular Products Financial Details
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Sales</span>
                        <span className="font-medium">
                          {formatCurrency(financialData.totalRegularSales)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Costs</span>
                        <span className="font-medium">
                          {formatCurrency(financialData.totalRegularCosts)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="font-medium">Total Profit</span>
                        <span
                          className={`font-medium ${financialData.totalRegularProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {formatCurrency(financialData.totalRegularProfit)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Profit Margin</span>
                        <span
                          className={`font-medium ${financialData.totalRegularProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {financialData.totalRegularSales > 0
                            ? `${Math.round(
                                (financialData.totalRegularProfit /
                                  financialData.totalRegularSales) *
                                  100,
                              )}%`
                            : "0%"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="outer" className="mt-4">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-medium mb-4">
                      Outer Products Financial Details
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Sales</span>
                        <span className="font-medium">
                          {formatCurrency(financialData.totalOuterSales)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Costs</span>
                        <span className="font-medium">
                          {formatCurrency(financialData.totalOuterCosts)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="font-medium">Total Profit</span>
                        <span
                          className={`font-medium ${financialData.totalOuterProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {formatCurrency(financialData.totalOuterProfit)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Profit Margin</span>
                        <span
                          className={`font-medium ${financialData.totalOuterProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {financialData.totalOuterSales > 0
                            ? `${Math.round(
                                (financialData.totalOuterProfit /
                                  financialData.totalOuterSales) *
                                  100,
                              )}%`
                            : "0%"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default FinancialSummary;
