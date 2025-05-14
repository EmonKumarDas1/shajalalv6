import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerReturnFlow } from "./CustomerReturnFlow";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function ReturnProcessPage() {
  const [showReturnFlow, setShowReturnFlow] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/dashboard/returns")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Process Return</h1>
        </div>
      </div>

      {!showReturnFlow ? (
        <Card>
          <CardHeader>
            <CardTitle>Return Process</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-blue-800 font-medium">
                Return Process Steps
              </h3>
              <ol className="mt-2 space-y-2 text-sm text-blue-700">
                <li className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                    1
                  </span>
                  <span>Select the customer who wants to return a product</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Select the invoice containing the product to be returned
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                    3
                  </span>
                  <span>Choose the product and specify return details</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                    4
                  </span>
                  <span>Select whether to process a refund or exchange</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                    5
                  </span>
                  <span>Complete the return process</span>
                </li>
              </ol>
            </div>

            <div className="flex justify-center">
              <Button onClick={() => setShowReturnFlow(true)} size="lg">
                Start Return Process
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <CustomerReturnFlow
          onSuccess={() => navigate("/dashboard/returns")}
          onCancel={() => setShowReturnFlow(false)}
        />
      )}
    </div>
  );
}
