
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  ClipboardList,
  FileText,
} from "lucide-react";

const menuItems = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Disponibilités", href: "/admin/disponibilites", icon: CheckSquare },
  { name: "Suivi Candidatures", href: "/admin/candidatures", icon: ClipboardList },
  { name: "Surveillants", href: "/admin/surveillants", icon: Users },
  { name: "Sessions", href: "/admin/sessions", icon: FileText },
];

export const AdminSidebar = () => {
  const location = useLocation();

  return (
    <div className="w-64 min-w-64 bg-white border-r border-gray-200 flex flex-col min-h-screen">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Administration</h2>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm rounded-lg transition-colors w-full",
                isActive
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className={cn("w-5 h-5 mr-3 flex-shrink-0", isActive ? "text-blue-700" : "text-gray-500")} />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
