import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit, Eye, Plus, Search } from "lucide-react";

type Order = {
  id: string;
  customer: string;
  date: string;
  total: string;
  payment: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
};

export function OrdersTable() {
  // This would typically come from your data source
  const orders: Order[] = [
    {
      id: "ORD-7892",
      customer: "John Smith",
      date: "2023-06-01",
      total: "$129.99",
      payment: "Credit Card",
      status: "pending",
    },
    {
      id: "ORD-7891",
      customer: "Sarah Johnson",
      date: "2023-05-30",
      total: "$549.00",
      payment: "PayPal",
      status: "processing",
    },
    {
      id: "ORD-7890",
      customer: "Michael Brown",
      date: "2023-05-29",
      total: "$79.99",
      payment: "Credit Card",
      status: "shipped",
    },
    {
      id: "ORD-7889",
      customer: "Emily Davis",
      date: "2023-05-28",
      total: "$199.50",
      payment: "Credit Card",
      status: "delivered",
    },
    {
      id: "ORD-7888",
      customer: "Robert Wilson",
      date: "2023-05-27",
      total: "$349.99",
      payment: "PayPal",
      status: "cancelled",
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
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search orders..."
            className="w-full bg-white pl-8"
          />
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Create Order
        </Button>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.id}</TableCell>
                <TableCell>{order.customer}</TableCell>
                <TableCell>{order.date}</TableCell>
                <TableCell>{order.total}</TableCell>
                <TableCell>{order.payment}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={getStatusColor(order.status)}
                  >
                    {order.status.charAt(0).toUpperCase() +
                      order.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
