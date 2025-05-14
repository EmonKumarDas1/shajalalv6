import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Separator } from "../../components/ui/separator";
import { supabase } from "../../../supabase/supabase";
import { ProductHistory } from "../../types/schema";

export default function ProductHistoryDemo() {
  const [productHistory, setProductHistory] = useState<ProductHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProductHistory() {
      try {
        const { data, error } = await supabase
          .from("product_history")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setProductHistory(data || []);
      } catch (error) {
        console.error("Error fetching product history:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProductHistory();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Product History Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-4">
              Loading product history...
            </div>
          ) : productHistory.length === 0 ? (
            <div className="text-center p-4">No product history found</div>
          ) : (
            <div className="space-y-6">
              {productHistory.map((history, index) => (
                <div key={history.id} className="relative">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white">
                      {history.action_type === "created"
                        ? "➕"
                        : history.action_type === "updated"
                          ? "🔄"
                          : history.action_type === "restocked"
                            ? "📦"
                            : "🔍"}
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="font-medium">
                        {history.action_type.charAt(0).toUpperCase() +
                          history.action_type.slice(1)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(history.created_at).toLocaleString()}
                      </div>
                      <div className="mt-2">
                        <span className="font-semibold">Quantity:</span>{" "}
                        {history.quantity}
                      </div>
                      {history.notes && (
                        <div className="mt-1">
                          <span className="font-semibold">Notes:</span>{" "}
                          {history.notes}
                        </div>
                      )}
                    </div>
                  </div>
                  {index < productHistory.length - 1 && (
                    <Separator className="my-4" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
