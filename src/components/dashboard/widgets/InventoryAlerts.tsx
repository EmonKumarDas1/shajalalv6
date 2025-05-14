import { useState, useEffect } from "react";
import { supabase } from "../../../../supabase/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Package, AlertTriangle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

type InventoryItem = {
  id: string;
  name: string;
  stock: number;
  threshold: number;
  status: "critical" | "low" | "normal";
};

export function InventoryAlerts() {
  // This would typically come from your data source
  const lowStockItems: InventoryItem[] = [
    {
      id: "1",
      name: "iPhone 13 Pro",
      stock: 2,
      threshold: 5,
      status: "critical",
    },
    {
      id: "2",
      name: "Samsung Galaxy S22",
      stock: 4,
      threshold: 5,
      status: "low",
    },
    {
      id: "3",
      name: "MacBook Pro M1",
      stock: 3,
      threshold: 5,
      status: "low",
    },
  ];

  const navigate = useNavigate();

  const handleRestockClick = () => {
    navigate("/dashboard/products");
  };

  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium">
            Inventory Alerts
          </CardTitle>
          <CardDescription>Items requiring attention</CardDescription>
        </div>
        <div className="h-10 w-10 rounded-full bg-amber-50 p-2">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <div className="space-y-4">
          {lowStockItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-6 py-1"
            >
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full bg-gray-100 p-1">
                  <Package className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-gray-500">
                    {item.stock} of {item.threshold} remaining
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={`${item.status === "critical" ? "border-red-200 bg-red-50 text-red-600" : "border-amber-200 bg-amber-50 text-amber-600"}`}
              >
                {item.status === "critical" ? "Critical" : "Low Stock"}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          className="w-full flex items-center gap-2"
          onClick={handleRestockClick}
        >
          <RefreshCw className="h-4 w-4" />
          Restock Inventory
        </Button>
      </CardFooter>
    </Card>
  );
}
