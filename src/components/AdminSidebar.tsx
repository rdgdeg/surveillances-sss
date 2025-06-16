
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  Settings,
  ClipboardList,
  UserCheck,
  MapPin,
  AlertTriangle,
  Grid3X3,
  Eye,
  CheckSquare,
  MessageSquare,
  UserPlus,
  FileSpreadsheet
} from "lucide-react";

const menuItems = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Sessions", href: "/admin/sessions", icon: Calendar },
  { name: "Examens", href: "/admin/examens", icon: FileText },
  { name: "Surveillants", href: "/admin/surveillants", icon: Users },
  { name: "Candidatures", href: "/admin/candidatures", icon: UserPlus },
  { name: "Collecte Dispos", href: "/admin/collecte", icon: ClipboardList },
  { name: "Disponibilités", href: "/admin/disponibilites", icon: CheckSquare },
  { name: "Suivi Dispos", href: "/admin/suivi-disponibilites", icon: Eye },
  { name: "Gestion Dispos", href: "/admin/gestion-disponibilites", icon: FileSpreadsheet },
  { name: "Matrice", href: "/admin/matrice", icon: Grid3X3 },
  { name: "Attributions", href: "/admin/attributions", icon: UserCheck },
  { name: "Auditoires", href: "/admin/auditoires", icon: MapPin },
  { name: "Demandes Modif", href: "/admin/demandes-modification", icon: MessageSquare },
  { name: "Problèmes", href: "/admin/problemes", icon: AlertTriangle },
  { name: "Paramètres", href: "/admin/settings", icon: Settings },
];

export const AdminSidebar = () => {
  const location = useLocation();

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
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
                "flex items-center px-3 py-2 text-sm rounded-lg transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className={cn("w-5 h-5 mr-3", isActive ? "text-blue-700" : "text-gray-500")} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
