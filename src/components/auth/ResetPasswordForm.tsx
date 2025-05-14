import { useState, useEffect } from "react";
import { useAuth } from "../../../supabase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { useToast } from "@/components/ui/use-toast";

export default function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if we have the necessary parameters from the reset link
    if (!searchParams.get("access_token")) {
      toast({
        title: "Invalid reset link",
        description: "The password reset link is invalid or has expired.",
        variant: "destructive",
        duration: 5000,
      });
      navigate("/login");
    }
  }, [searchParams, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      await updatePassword(password);
      toast({
        title: "Password updated",
        description: "Your password has been successfully updated.",
        duration: 5000,
      });
      navigate("/login");
    } catch (error) {
      setError("Failed to update password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-md mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Create new password
          </h1>
          <p className="text-gray-600 mt-2">
            Your new password must be different from previous passwords
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-sm font-medium text-gray-700"
            >
              New password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Password must be at least 8 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="confirmPassword"
              className="text-sm font-medium text-gray-700"
            >
              Confirm password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="h-12 rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button
            type="submit"
            className="w-full h-12 rounded-full bg-black text-white hover:bg-gray-800 text-sm font-medium"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Updating..." : "Reset password"}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
