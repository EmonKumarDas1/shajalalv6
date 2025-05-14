import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  Box,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
  Store,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

type NavItem = {
  title: string;
  icon: React.ReactNode;
  href: string;
  color?: string;
  translationKey?: string;
};

interface SidebarProps {
  activeItem?: string;
  onItemClick?: (label: string) => void;
}

const dashboardItems: NavItem[] = [
  {
    title: "Dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
    href: "/dashboard",
    color: "text-blue-600",
    translationKey: "dashboard",
  },
];

const inventoryItems: NavItem[] = [
  {
    title: "Shops",
    icon: <Store className="h-5 w-5" />,
    href: "/dashboard/shops",
    color: "text-orange-600",
    translationKey: "shops",
  },
  {
    title: "Suppliers",
    icon: <Truck className="h-5 w-5" />,
    href: "/dashboard/suppliers",
    color: "text-yellow-600",
    translationKey: "suppliers",
  },
  {
    title: "Products",
    icon: <Package className="h-5 w-5" />,
    href: "/dashboard/products",
    color: "text-violet-600",
    translationKey: "products",
  },
  {
    title: "Employees",
    icon: <Users className="h-5 w-5" />,
    href: "/dashboard/employees",
    color: "text-cyan-600",
    translationKey: "employees",
  },
];

const salesItems: NavItem[] = [
  {
    title: "Sell Product",
    icon: <ShoppingCart className="h-5 w-5" />,
    href: "/dashboard/sell-product",
    color: "text-green-600",
    translationKey: "sellProduct",
  },
  // {
  //   title: "Orders",
  //   icon: <ClipboardList className="h-5 w-5" />,
  //   href: "/dashboard/orders",
  //   color: "text-pink-600",
  //   translationKey: "orders",
  // },
  {
    title: "Invoices",
    icon: <FileText className="h-5 w-5" />,
    href: "/dashboard/invoices",
    color: "text-purple-600",
    translationKey: "invoices",
  },
  {
    title: "Chalans",
    icon: <ClipboardList className="h-5 w-5" />,
    href: "/dashboard/chalans",
    color: "text-indigo-600",
    translationKey: "chalans",
  },
  {
    title: "Returns",
    icon: <Box className="h-5 w-5" />,
    href: "/dashboard/returns",
    color: "text-red-600",
    translationKey: "returns",
  },
  // {
  //   title: "Sales",
  //   icon: <TrendingUp className="h-5 w-5" />,
  //   href: "/dashboard/sales",
  //   color: "text-green-600",
  //   translationKey: "sales",
  // },
  {
    title: "Customers",
    icon: <Users className="h-5 w-5" />,
    href: "/dashboard/customers",
    color: "text-blue-600",
    translationKey: "customers",
  },
];

const financeItems: NavItem[] = [
  // {
  //   title: "Accounting",
  //   icon: <CreditCard className="h-5 w-5" />,
  //   href: "/dashboard/accounting",
  //   color: "text-red-600",
  //   translationKey: "accounting",
  // },
  {
    title: "Other Costs",
    icon: <Box className="h-5 w-5" />,
    href: "/dashboard/costs",
    color: "text-teal-600",
    translationKey: "otherCosts",
  },
  {
    title: "Employee Salary",
    icon: <Users className="h-5 w-5" />,
    href: "/dashboard/employee-salary",
    color: "text-purple-600",
    translationKey: "employeeSalary",
  },
  // {
  //   title: "Reports",
  //   icon: <BarChart3 className="h-5 w-5" />,
  //   href: "/dashboard/reports",
  //   color: "text-indigo-600",
  //   translationKey: "reports",
  // },
];

export default function Sidebar({
  activeItem = "Dashboard",
  onItemClick = () => {},
}: SidebarProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  // Dispatch custom event when sidebar state changes
  useEffect(() => {
    const event = new CustomEvent("sidebarStateChange", {
      detail: { expanded: !collapsed, width: collapsed ? 70 : 280 },
    });
    window.dispatchEvent(event);
  }, [collapsed]);

  const renderNavSection = (items: NavItem[], title: string) => (
    <div className="space-y-1.5">
      {!collapsed && (
        <h3 className="text-xs font-medium px-4 py-1 text-gray-500 uppercase tracking-wider">
          {t(title)}
        </h3>
      )}
      <TooltipProvider delayDuration={0}>
        {items.map((item) => (
          <Tooltip key={item.title} delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 h-10 rounded-xl text-sm font-medium",
                  item.title === activeItem || location.pathname === item.href
                    ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                    : "text-gray-700 hover:bg-gray-100",
                  collapsed && "justify-center px-0",
                )}
                onClick={() => onItemClick(item.title)}
                asChild
              >
                <Link to={item.href}>
                  <span
                    className={cn(
                      item.title === activeItem ||
                        location.pathname === item.href
                        ? item.color
                        : "text-gray-500",
                    )}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <span>{t(item.translationKey || item.title)}</span>
                  )}
                </Link>
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">
                {t(item.translationKey || item.title)}
              </TooltipContent>
            )}
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );

  return (
    <div
      className={cn(
        "relative flex h-screen flex-col border-r bg-white/80 backdrop-blur-md transition-all duration-300",
        collapsed ? "w-16" : "w-[280px]",
      )}
    >
      <div className="flex h-14 items-center border-b px-3">
        <Link
          to="/dashboard"
          className={cn(
            "flex items-center gap-2 font-semibold",
            collapsed ? "justify-center" : "px-2",
          )}
        >
          <Box className="h-6 w-6 text-blue-600" />
          {!collapsed && <span>ElectroShop ERP</span>}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute right-2 top-3 h-8 w-8",
            collapsed && "right-[-12px] rounded-full border bg-white",
          )}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className={cn("p-6", collapsed && "p-3")}>
        <h2
          className={cn(
            "text-xl font-semibold mb-2 text-gray-900",
            collapsed && "hidden",
          )}
        >
          {t("electroshop")}
        </h2>
        <p className={cn("text-sm text-gray-500", collapsed && "hidden")}>
          {t("manageInventory")}
        </p>
      </div>

      <ScrollArea className="flex-1 px-4">
        {renderNavSection(dashboardItems, "overview")}
        <Separator className="my-4 bg-gray-100" />
        {renderNavSection(inventoryItems, "inventory")}
        <Separator className="my-4 bg-gray-100" />
        {renderNavSection(salesItems, "sales")}
        <Separator className="my-4 bg-gray-100" />
        {renderNavSection(financeItems, "finance")}
      </ScrollArea>

      <div className="p-4 mt-auto border-t border-gray-200">
        <div className="flex justify-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
