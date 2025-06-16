
import { ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  return (
    <div className="flex min-h-screen bg-gray-50 w-full">
      <AdminSidebar />
      <main className="flex-1 w-full max-w-none">
        <div className="w-full h-full p-6">
          {children}
        </div>
      </main>
    </div>
  );
};
