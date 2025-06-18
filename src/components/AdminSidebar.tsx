
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
  BookOpen,
  Upload,
  CalendarDays,
  UserCog,
  Shield,
  Lock,
  History,
  Database,
  UserPlus,
  FileCheck,
  FileSpreadsheet,
  Settings,
  BarChart3,
  MapPin
} from "lucide-react";

const menuItems = [
  // DASHBOARD
  { 
    category: "Vue d'ensemble",
    items: [
      { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    ]
  },
  
  // GESTION DES DISPONIBILITÉS
  { 
    category: "Disponibilités",
    items: [
      { name: "Vue d'ensemble", href: "/admin/disponibilites", icon: Eye },
      { name: "Par jour", href: "/admin/disponibilites/par-jour", icon: Calendar },
      { name: "Matrice créneaux", href: "/admin/disponibilites/matrice", icon: Grid3X3 },
      { name: "Par personne", href: "/admin/disponibilites/par-personne", icon: UserCheck },
      { name: "Demandes spécifiques", href: "/admin/demandes-specifiques", icon: AlertTriangle },
    ]
  },

  // GESTION DES DONNÉES
  { 
    category: "Import & Templates",
    items: [
      { name: "Templates & Import", href: "/admin/templates", icon: FileSpreadsheet },
      { name: "Codes Examens", href: "/admin?tab=import-codes", icon: Upload },
    ]
  },

  // EXAMENS ET PLANNING
  { 
    category: "Examens & Planning",
    items: [
      { name: "Gestion Examens", href: "/admin?tab=examens", icon: BookOpen },
      { name: "Planning", href: "/admin?tab=planning", icon: CalendarDays },
      { name: "Validations", href: "/admin?tab=validations", icon: FileCheck },
    ]
  },

  // SURVEILLANTS
  { 
    category: "Surveillants",
    items: [
      { name: "Gestion Surveillants", href: "/admin?tab=surveillants", icon: Users },
      { name: "Pré-assignations", href: "/admin?tab=pre-assignations", icon: UserPlus },
      { name: "Candidatures", href: "/admin/candidatures", icon: ClipboardList },
    ]
  },

  // ENSEIGNANTS
  { 
    category: "Enseignants",
    items: [
      { name: "Vue Enseignant", href: "/admin?tab=enseignant-view", icon: UserCog },
      { name: "Tokens Enseignants", href: "/admin?tab=tokens-enseignants", icon: Shield },
      { name: "Suivi Confirmations", href: "/admin?tab=suivi-confirm-enseignants", icon: FileText },
    ]
  },

  // CONFIGURATION
  { 
    category: "Configuration",
    items: [
      { name: "Contraintes Salles", href: "/admin?tab=contraintes", icon: MapPin },
      { name: "Verrouillages", href: "/admin?tab=feature-locks", icon: Lock },
      { name: "Contrôles", href: "/admin?tab=controles-verifications", icon: FileCheck },
    ]
  },

  // ADMINISTRATION
  { 
    category: "Administration",
    items: [
      { name: "Historique", href: "/admin?tab=historique", icon: History },
      { name: "Données Sensibles", href: "/admin?tab=donnees-sensibles", icon: Database },
    ]
  }
];

export const AdminSidebar = () => {
  const location = useLocation();

  const isItemActive = (href: string) => {
    if (href === "/admin") {
      return location.pathname === "/admin" && !location.search;
    }
    
    if (href.includes('?tab=')) {
      return location.search.includes(href.split('?tab=')[1]);
    }
    
    return location.pathname === href;
  };

  return (
    <div className="w-64 min-w-64 bg-white border-r border-gray-200 flex flex-col min-h-screen">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Administration</h2>
      </div>
      
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {menuItems.map((category) => (
          <div key={category.category} className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3">
              {category.category}
            </h3>
            <div className="space-y-1">
              {category.items.map((item) => {
                const Icon = item.icon;
                const isActive = isItemActive(item.href);
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm rounded-lg transition-colors w-full",
                      isActive
                        ? "bg-blue-50 text-blue-700 font-medium border-l-2 border-blue-500"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <Icon className={cn(
                      "w-4 h-4 mr-3 flex-shrink-0", 
                      isActive ? "text-blue-700" : "text-gray-500"
                    )} />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
};
