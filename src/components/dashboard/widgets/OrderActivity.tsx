import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";

type Order = {
  id: string;
  customer: string;
  date: string;
  amount: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
};

export function OrderActivity() {
  // This would typically come from your data source
  const recentOrders: Order[] = [
    {
      id: "ORD-7892",
      customer: "John Smith",
      date: "2 mins ago",
      amount: "$129.99",
      status: "pending",
    },
    {
      id: "ORD-7891",
      customer: "Sarah Johnson",
      date: "34 mins ago",
      amount: "$549.00",
      status: "processing",
    },
    {
      id: "ORD-7890",
      customer: "Michael Brown",
      date: "2 hours ago",
      amount: "$79.99",
      status: "shipped",
    },
  ];

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return "border-yellow-200 bg-yellow-50 text-yellow-600";
      case "processing":
        return "border-blue-200 bg-blue-50 text-blue-600";
      case "shipped":
        return "border-purple-200 bg-purple-50 text-purple-600";
      case "delivered":
        return "border-green-200 bg-green-50 text-green-600";
      case "cancelled":
        return "border-red-200 bg-red-50 text-red-600";
      default:
        return "";
    }
  };

  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium">
            Order Activity
          </CardTitle>
          <CardDescription>Recent customer orders</CardDescription>
        </div>
        <div className="h-10 w-10 rounded-full bg-indigo-50 p-2">
          <ClipboardList className="h-6 w-6 text-indigo-600" />
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <div className="space-y-4">
          {recentOrders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between px-6 py-1"
            >
              <div>
                <p className="text-sm font-medium">{order.id}</p>
                <p className="text-xs text-gray-500">{order.customer}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{order.amount}</p>
                <p className="text-xs text-gray-500">{order.date}</p>
              </div>
              <Badge variant="outline" className={getStatusColor(order.status)}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full">
          View All Orders
        </Button>
      </CardFooter>
    </Card>
  );
}
