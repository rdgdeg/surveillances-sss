
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  ClipboardList,
  FileText,
  AlertTriangle,
  Calendar,
  Grid3X3,
  UserCheck,
  Eye,
} from "lucide-react";

const menuItems = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { 
    name: "Disponibilités", 
    href: "/admin/disponibilites", 
    icon: CheckSquare,
    submenu: [
      { name: "Vue d'ensemble", href: "/admin/disponibilites", icon: Eye },
      { name: "Vue par jour", href: "/admin/disponibilites/par-jour", icon: Calendar },
      { name: "Matrice créneaux", href: "/admin/disponibilites/matrice", icon: Grid3X3 },
      { name: "Vue par personne", href: "/admin/disponibilites/par-personne", icon: UserCheck },
    ]
  },
  { name: "Demandes Spécifiques", href: "/admin/demandes-specifiques", icon: AlertTriangle },
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
          
          if ('submenu' in item) {
            const isSubmenuActive = item.submenu?.some(sub => location.pathname === sub.href);
            return (
              <div key={item.name} className="space-y-1">
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm rounded-lg transition-colors w-full font-medium",
                    isActive || isSubmenuActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon className={cn("w-5 h-5 mr-3 flex-shrink-0", (isActive || isSubmenuActive) ? "text-blue-700" : "text-gray-500")} />
                  <span className="truncate">{item.name}</span>
                </Link>
                <div className="ml-8 space-y-1">
                  {item.submenu?.map((subItem) => {
                    const SubIcon = subItem.icon;
                    const isSubActive = location.pathname === subItem.href;
                    return (
                      <Link
                        key={subItem.name}
                        to={subItem.href}
                        className={cn(
                          "flex items-center px-3 py-1 text-xs rounded transition-colors w-full",
                          isSubActive
                            ? "bg-blue-100 text-blue-700 font-medium"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                        )}
                      >
                        <SubIcon className={cn("w-3 h-3 mr-2 flex-shrink-0", isSubActive ? "text-blue-700" : "text-gray-400")} />
                        <span className="truncate">{subItem.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }
          
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
