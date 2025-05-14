import { useState } from "react";
import { useAuth } from "../../../supabase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { useToast } from "@/components/ui/use-toast";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { resetPassword } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await resetPassword(email);
      toast({
        title: "Password reset email sent",
        description: "Please check your email for password reset instructions.",
        duration: 5000,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send password reset email. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-md mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Reset your password
          </h1>
          <p className="text-gray-600 mt-2">
            Enter your email and we'll send you instructions to reset your
            password
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-sm font-medium text-gray-700"
            >
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 rounded-full bg-black text-white hover:bg-gray-800 text-sm font-medium"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send reset instructions"}
          </Button>

          <div className="text-sm text-center text-gray-600 mt-6">
            <Link
              to="/login"
              className="text-blue-600 hover:underline font-medium"
            >
              Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}
