import { ReactNode } from "react";
import { Link } from "react-router-dom";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-black">
      <div className="min-h-screen flex flex-col">
        <div className="flex-grow flex items-center justify-center">
          <div className="max-w-md w-full px-4">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-semibold tracking-tight">
                ERP System
              </h2>
              <p className="text-xl font-medium text-gray-500 mt-2">
                Sign in to access your account
              </p>
            </div>
            {children}
          </div>
        </div>
        <footer className="py-4 bg-gray-100 text-center text-gray-600">
          <p>This software designed by X-Orbit</p>
        </footer>
      </div>
    </div>
  );
}
