import React, { useState, useEffect } from "react";
import { DashboardLayout } from "../dashboard/layout/DashboardLayout";
import { QuickActions } from "../dashboard/widgets/QuickActions";
import { RevenueStats } from "../dashboard/widgets/RevenueStats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "../../../supabase/supabase";
import {
  RefreshCw,
  DollarSign,
  TrendingUp,
  Package,
  AlertCircle,
  BarChart,
  PieChart,
  ShoppingCart,
  CreditCard,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, subDays, subWeeks, subMonths, subYears } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState("monthly");
  const [shopFilter, setShopFilter] = useState<string>("all");
  const [shops, setShops] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState({
    financialOverview: {
      income: 0,
      expenses: 0,
      netProfit: 0,
      outstandingCredits: 0,
      expenseBreakdown: [],
    },
    salesOverview: {
      sales: 0,
      totalOrderAmount: 0,
      completedOrders: 0,
      pendingOrders: 0,
      bestSellingProducts: [],
    },
    inventoryOverview: {
      lowStockItems: [],
      totalStock: 0,
      creditDue: 0,
    },
  });

  useEffect(() => {
    fetchDashboardData();
    fetchShops();
  }, [dateRange, shopFilter]);

  async function fetchShops() {
    try {
      const { data, error } = await supabase
        .from("shops")
        .select("*")
        .order("name");

      if (error) throw error;
      setShops(data || []);
    } catch (error) {
      console.error("Error fetching shops:", error);
    }
  }

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange(dateRange);

      // Fetch sales invoices (income-related)
      let salesInvoicesQuery = supabase
        .from("invoices")
        .select(
          "id, status, total_amount, advance_payment, remaining_amount, created_at, invoice_type, shop_id",
        )
        .eq("invoice_type", "sales")
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      // Apply shop filter if selected
      if (shopFilter !== "all") {
        salesInvoicesQuery = salesInvoicesQuery.eq("shop_id", shopFilter);
      }

      const { data: salesInvoicesData } = await salesInvoicesQuery;

      // Fetch product invoices (expense-related)
      let productInvoicesQuery = supabase
        .from("invoices")
        .select(
          "id, status, total_amount, advance_payment, remaining_amount, created_at, invoice_type, shop_id",
        )
        .eq("invoice_type", "product_addition")
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      // Apply shop filter if selected
      if (shopFilter !== "all") {
        productInvoicesQuery = productInvoicesQuery.eq("shop_id", shopFilter);
      }

      const { data: productInvoicesData } = await productInvoicesQuery;

      // Fetch payments (for both sales and product invoices)
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("invoice_id, amount, payment_date")
        .gte("payment_date", startDate)
        .lte("payment_date", endDate);

      // Fetch other expenses
      const { data: expensesData } = await supabase
        .from("others_costs")
        .select("amount, category, date")
        .gte("date", startDate)
        .lte("date", endDate);

      // Fetch salary payments
      const { data: salaryData } = await supabase
        .from("salary_payments")
        .select("amount, payment_date")
        .gte("payment_date", startDate)
        .lte("payment_date", endDate);

      // Fetch products
      let productsQuery = supabase
        .from("products")
        .select("id, name, quantity, buying_price, remaining_amount, shop_id");

      // Apply shop filter if selected
      if (shopFilter !== "all") {
        productsQuery = productsQuery.eq("shop_id", shopFilter);
      }

      const { data: productsData } = await productsQuery;

      // Fetch invoice items for best-selling products (sales invoices only)
      const { data: invoiceItemsData } = await supabase
        .from("invoice_items")
        .select("product_id, quantity, unit_price")
        .in(
          "invoice_id",
          (salesInvoicesData || []).map((inv) => inv.id),
        );

      // Calculate financial metrics
      const income = calculateIncome(salesInvoicesData, paymentsData);
      const expenses = calculateExpenses(
        expensesData,
        salaryData,
        productInvoicesData,
        paymentsData,
      );
      const netProfit = income - expenses;
      const outstandingCredits = calculateOutstandingCredits(salesInvoicesData);
      const expenseBreakdown = calculateExpenseBreakdown(
        expensesData,
        salaryData,
        productInvoicesData,
      );
      const creditDue = calculateCreditDue(productsData, productInvoicesData);

      // Calculate sales metrics
      const sales = calculateSales(salesInvoicesData, paymentsData);
      const totalOrderAmount = calculateTotalOrderAmount(salesInvoicesData);
      const completedOrders = (salesInvoicesData || []).filter(
        (inv) => inv.status === "paid",
      ).length;
      const pendingOrders = (salesInvoicesData || []).filter(
        (inv) => inv.status !== "paid",
      ).length;
      const bestSellingProducts = calculateBestSellingProducts(
        invoiceItemsData,
        productsData,
      );

      // Calculate inventory metrics
      const lowStockItems = (productsData || []).filter(
        (product) => product.quantity < 10,
      );
      const totalStock = (productsData || []).reduce(
        (sum, product) => sum + Number(product.quantity || 0),
        0,
      );

      setDashboardData({
        financialOverview: {
          income,
          expenses,
          netProfit,
          outstandingCredits,
          expenseBreakdown,
        },
        salesOverview: {
          sales,
          totalOrderAmount,
          completedOrders,
          pendingOrders,
          bestSellingProducts,
        },
        inventoryOverview: {
          lowStockItems,
          totalStock,
          creditDue,
        },
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper Functions
  const getDateRange = (range) => {
    const endDate = new Date().toISOString();
    let startDate;
    switch (range) {
      case "daily":
        startDate = subDays(new Date(), 1).toISOString();
        break;
      case "weekly":
        startDate = subWeeks(new Date(), 1).toISOString();
        break;
      case "monthly":
        startDate = subMonths(new Date(), 1).toISOString();
        break;
      case "yearly":
        startDate = subYears(new Date(), 1).toISOString();
        break;
      default:
        startDate = subMonths(new Date(), 1).toISOString();
    }
    return { startDate, endDate };
  };

  const calculateIncome = (salesInvoices, payments) => {
    // Income is the total payments received for sales invoices in the date range
    const paymentMap = (payments || []).reduce((acc, payment) => {
      acc[payment.invoice_id] =
        (acc[payment.invoice_id] || 0) + Number(payment.amount || 0);
      return acc;
    }, {});

    return (salesInvoices || []).reduce((sum, invoice) => {
      const paymentsReceived = paymentMap[invoice.id] || 0;
      const advance = Number(invoice.advance_payment || 0);
      return sum + paymentsReceived + advance; // Only count what's been paid
    }, 0);
  };

  const calculateExpenses = (
    expensesData,
    salaryData,
    productInvoices,
    payments,
  ) => {
    // Expenses from others_costs
    const othersCosts = (expensesData || []).reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );

    // Expenses from salary payments
    const salaryCosts = (salaryData || []).reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );

    // Expenses from payments to suppliers (product invoices)
    const paymentMap = (payments || []).reduce((acc, payment) => {
      acc[payment.invoice_id] =
        (acc[payment.invoice_id] || 0) + Number(payment.amount || 0);
      return acc;
    }, {});
    const productInvoiceCosts = (productInvoices || []).reduce(
      (sum, invoice) => {
        const paymentsMade = paymentMap[invoice.id] || 0;
        const advance = Number(invoice.advance_payment || 0);
        return sum + paymentsMade + advance; // Only count what's been paid to suppliers
      },
      0,
    );

    return othersCosts + salaryCosts + productInvoiceCosts;
  };

  const calculateOutstandingCredits = (salesInvoices) => {
    // Total unpaid by customers from sales invoices
    return (salesInvoices || []).reduce((sum, invoice) => {
      if (invoice.status !== "paid") {
        return sum + Number(invoice.remaining_amount || 0);
      }
      return sum;
    }, 0);
  };

  const calculateCreditDue = (products, productInvoices) => {
    // Total owed to suppliers from product invoices and products
    const productInvoiceDue = (productInvoices || []).reduce((sum, invoice) => {
      return sum + Number(invoice.remaining_amount || 0);
    }, 0);

    const productDue = (products || []).reduce((sum, product) => {
      return sum + Number(product.remaining_amount || 0);
    }, 0);

    return productInvoiceDue + productDue;
  };

  const calculateSales = (salesInvoices, payments) => {
    // Total sales revenue from completed or partially paid sales invoices
    const paymentMap = (payments || []).reduce((acc, payment) => {
      acc[payment.invoice_id] =
        (acc[payment.invoice_id] || 0) + Number(payment.amount || 0);
      return acc;
    }, {});

    return (salesInvoices || []).reduce((sum, invoice) => {
      if (invoice.status === "paid" || invoice.status === "partially_paid") {
        const paymentsReceived = paymentMap[invoice.id] || 0;
        const advance = Number(invoice.advance_payment || 0);
        return sum + paymentsReceived + advance;
      }
      return sum;
    }, 0);
  };

  const calculateTotalOrderAmount = (salesInvoices) => {
    // Total amount of all sales invoices (pending + completed)
    return (salesInvoices || []).reduce(
      (sum, invoice) => sum + Number(invoice.total_amount || 0),
      0,
    );
  };

  const calculateExpenseBreakdown = (
    expensesData,
    salaryData,
    productInvoices,
  ) => {
    const breakdown = {};

    // Others costs by category
    (expensesData || []).forEach((item) => {
      const category = item.category || "Miscellaneous";
      breakdown[category] =
        (breakdown[category] || 0) + Number(item.amount || 0);
    });

    // Salary payments
    const salaryTotal = (salaryData || []).reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );
    if (salaryTotal > 0) breakdown["Salaries"] = salaryTotal;

    // Product invoice payments
    const productInvoiceTotal = (productInvoices || []).reduce(
      (sum, invoice) => sum + Number(invoice.advance_payment || 0),
      0,
    );
    if (productInvoiceTotal > 0)
      breakdown["Inventory Purchases"] = productInvoiceTotal;

    return Object.entries(breakdown)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  };

  const calculateBestSellingProducts = (invoiceItems, productsData) => {
    const productQuantities = {};
    (invoiceItems || []).forEach((item) => {
      const productId = item.product_id;
      productQuantities[productId] =
        (productQuantities[productId] || 0) + Number(item.quantity || 0);
    });

    return Object.entries(productQuantities)
      .map(([id, quantity]) => {
        const product = (productsData || []).find((p) => p.id === id) || {
          name: "Unknown Product",
        };
        return { id, name: product.name, quantity };
      })
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  };

  const handleRefresh = () => {
    fetchDashboardData();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-gray-500">
              Overview of your business performance.
            </p>
          </div>
          <div className="flex gap-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <Select value={shopFilter} onValueChange={setShopFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by shop" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shops</SelectItem>
                {shops.map((shop) => (
                  <SelectItem key={shop.id} value={shop.id}>
                    {shop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleRefresh}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-4 h-9 shadow-sm transition-colors flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              {loading ? "Loading..." : "Refresh"}
            </Button>
          </div>
        </div>

        <div
          className={cn(
            "transition-all duration-300 ease-in-out",
            loading && "opacity-60",
          )}
        >
          <Tabs defaultValue="financial" className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger
                value="financial"
                className="flex items-center gap-2"
              >
                <DollarSign className="h-4 w-4" />
                Financial
              </TabsTrigger>
              <TabsTrigger value="sales" className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Sales & Orders
              </TabsTrigger>
              <TabsTrigger
                value="inventory"
                className="flex items-center gap-2"
              >
                <Package className="h-4 w-4" />
                Inventory
              </TabsTrigger>
            </TabsList>

            {/* Financial Overview */}
            <TabsContent value="financial" className="space-y-6">
              <RevenueStats />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart className="h-5 w-5 text-blue-600" />
                      Income vs Expenses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                          <h3 className="text-sm font-medium text-green-800">
                            Income
                          </h3>
                          <p className="text-2xl font-bold text-green-600 mt-2">
                            ${dashboardData.financialOverview.income.toFixed(2)}
                          </p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                          <h3 className="text-sm font-medium text-red-800">
                            Expenses
                          </h3>
                          <p className="text-2xl font-bold text-red-600 mt-2">
                            $
                            {dashboardData.financialOverview.expenses.toFixed(
                              2,
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <h3 className="text-sm font-medium text-blue-800">
                          Net Profit
                        </h3>
                        <p
                          className={`text-2xl font-bold mt-2 ${
                            dashboardData.financialOverview.netProfit >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          $
                          {dashboardData.financialOverview.netProfit.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-purple-600" />
                      Expense Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {dashboardData.financialOverview.expenseBreakdown
                        .slice(0, 5)
                        .map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center"
                          >
                            <span className="text-sm font-medium">
                              {item.category}
                            </span>
                            <span className="text-sm font-bold">
                              ${item.amount.toFixed(2)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-orange-600" />
                      Outstanding Credits (Customers)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-orange-600">
                        $
                        {dashboardData.financialOverview.outstandingCredits.toFixed(
                          2,
                        )}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Total unpaid by customers
                      </p>
                      {/* <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() =>
                          navigate(
                            "/invoices?filter=sales&status=unpaid,partially_paid",
                          )
                        }
                      >
                        View Customer Credits
                      </Button> */}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-yellow-600" />
                      Credit Due (Suppliers)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-yellow-600">
                        ${dashboardData.inventoryOverview.creditDue.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Total owed for inventory
                      </p>
                      {/* <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() =>
                          navigate(
                            "/invoices?filter=product_addition&status=unpaid,partially_paid",
                          )
                        }
                      >
                        View Supplier Dues
                      </Button> */}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Sales & Orders */}
            <TabsContent value="sales" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5 text-blue-600" />
                      Sales Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <h3 className="text-sm font-medium text-blue-800">
                          Total Sales
                        </h3>
                        <p className="text-2xl font-bold text-blue-600 mt-2">
                          ${dashboardData.salesOverview.sales.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                        <h3 className="text-sm font-medium text-purple-800">
                          Total Orders Amount
                        </h3>
                        <p className="text-2xl font-bold text-purple-600 mt-2">
                          $
                          {dashboardData.salesOverview.totalOrderAmount.toFixed(
                            2,
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      Order Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                        <h3 className="text-sm font-medium text-green-800">
                          Completed Orders
                        </h3>
                        <p className="text-2xl font-bold text-green-600 mt-2">
                          {dashboardData.salesOverview.completedOrders}
                        </p>
                      </div>
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                        <h3 className="text-sm font-medium text-yellow-800">
                          Pending Orders
                        </h3>
                        <p className="text-2xl font-bold text-yellow-600 mt-2">
                          {dashboardData.salesOverview.pendingOrders}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Best Selling Products
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardData.salesOverview.bestSellingProducts.map(
                      (product, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center"
                        >
                          <span className="text-sm font-medium">
                            {product.name}
                          </span>
                          <Badge
                            variant="outline"
                            className="bg-green-100 text-green-800"
                          >
                            {product.quantity} units
                          </Badge>
                        </div>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Inventory */}
            <TabsContent value="inventory" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-blue-600" />
                      Total Stock
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-blue-600">
                      {dashboardData.inventoryOverview.totalStock}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Total items in inventory
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      Low Stock Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-red-600">
                      {dashboardData.inventoryOverview.lowStockItems.length}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Items below 10 units
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-yellow-600" />
                      Credit Due
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-yellow-600">
                        ${dashboardData.inventoryOverview.creditDue.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Owed for unpaid products
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    Low Stock Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardData.inventoryOverview.lowStockItems.length ===
                  0 ? (
                    <div className="text-center py-4 text-gray-500">
                      No low stock items found.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {dashboardData.inventoryOverview.lowStockItems
                        .slice(0, 5)
                        .map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100"
                          >
                            <div>
                              <h3 className="font-medium">{item.name}</h3>
                              <p className="text-sm text-gray-500">
                                SKU: {item.id.substring(0, 8)}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className="bg-red-100 text-red-800 border-red-200"
                            >
                              {item.quantity} left
                            </Badge>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-6">
            <QuickActions />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
