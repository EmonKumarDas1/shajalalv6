import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Header } from "./Header";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export function DashboardLayout({ children }: { children?: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(280);

  useEffect(() => {
    // Listen for sidebar state changes
    const handleSidebarStateChange = (event: CustomEvent) => {
      setSidebarExpanded(event.detail.expanded);
      setSidebarWidth(event.detail.width);
    };

    window.addEventListener(
      "sidebarStateChange",
      handleSidebarStateChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        "sidebarStateChange",
        handleSidebarStateChange as EventListener,
      );
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar for desktop */}
      <div className="hidden md:block fixed h-screen z-30">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <div
        className="flex w-full flex-col transition-all duration-300"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-x-hidden w-full">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
