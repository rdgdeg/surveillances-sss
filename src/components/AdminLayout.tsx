
import { ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { HomeButton } from "./HomeButton";
import { AdminProtection } from "./AdminProtection";
import { AdminBreadcrumbs } from "./AdminBreadcrumbs";

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  return (
    <AdminProtection>
      <div className="flex min-h-screen bg-gray-50 w-full">
        <AdminSidebar />
        <main className="flex-1 w-full max-w-none">
          <div className="w-full h-full">
            <div className="flex justify-between items-center p-4 bg-white border-b border-gray-200">
              <div className="flex-1"></div>
              <HomeButton />
            </div>
            <div className="p-6">
              <AdminBreadcrumbs />
              {children}
            </div>
          </div>
        </main>
      </div>
    </AdminProtection>
  );
};
