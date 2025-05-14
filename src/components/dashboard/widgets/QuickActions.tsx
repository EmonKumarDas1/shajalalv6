import { Package, ShoppingCart, Users } from "lucide-react";

type QuickAction = {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
};

export function QuickActions() {
  const actions: QuickAction[] = [
    {
      title: "Add Product",
      description: "Create a new product",
      icon: <Package className="h-5 w-5" />,
      href: "/dashboard/products/new",
      color: "bg-violet-100 text-violet-600",
    },
    {
      title: "New Order",
      description: "Create a new order",
      icon: <ShoppingCart className="h-5 w-5" />,
      href: "/dashboard/orders/new",
      color: "bg-pink-100 text-pink-600",
    },
    {
      title: "Add Customer",
      description: "Add a new customer",
      icon: <Users className="h-5 w-5" />,
      href: "/dashboard/customers/new",
      color: "bg-blue-100 text-blue-600",
    },
  ];

  return <></>;
}
