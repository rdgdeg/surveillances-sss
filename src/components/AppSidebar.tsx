import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Upload,
  Eye,
  Key,
  CheckSquare,
  Users,
  Calendar,
  Grid3X3,
  UserCheck,
  ClipboardList,
  MapPin,
  Shield,
  Lock,
  History,
  ShieldAlert,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<any>;
  tab: string | null;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const menuSections = [
  {
    title: "Vue d'ensemble",
    items: [
      { title: "Dashboard", href: "/admin", icon: LayoutDashboard, tab: null },
    ]
  },
  {
    title: "Gestion des Examens",
    items: [
      { title: "Examens", href: "/admin?tab=examens", icon: FileText, tab: "examens" },
      { title: "Import & Validation", href: "/admin?tab=validations", icon: Upload, tab: "validations" },
      { title: "Vue Enseignants", href: "/admin?tab=enseignant-view", icon: Eye, tab: "enseignant-view" },
      { title: "Tokens Enseignants", href: "/admin?tab=tokens-enseignants", icon: Key, tab: "tokens-enseignants" },
      { title: "Suivi Confirmations", href: "/admin?tab=suivi-confirm-enseignants", icon: CheckSquare, tab: "suivi-confirm-enseignants" },
    ]
  },
  {
    title: "Surveillance & Assignations",
    items: [
      { title: "Surveillants", href: "/admin?tab=surveillants", icon: Users, tab: "surveillants" },
      { title: "Disponibilités", href: "/admin?tab=disponibilites", icon: Calendar, tab: "disponibilites" },
      { title: "Matrice Disponibilités", href: "/admin?tab=matrice-disponibilites", icon: Grid3X3, tab: "matrice-disponibilites" },
      { title: "Pré-assignations", href: "/admin?tab=pre-assignations", icon: UserCheck, tab: "pre-assignations" },
      { title: "Candidatures", href: "/admin?tab=candidatures", icon: ClipboardList, tab: "candidatures" },
    ]
  },
  {
    title: "Configuration",
    items: [
      { title: "Contraintes Salles", href: "/admin?tab=contraintes", icon: MapPin, tab: "contraintes" },
      { title: "Contrôles & Vérifications", href: "/admin?tab=controles-verifications", icon: Shield, tab: "controles-verifications" },
    ]
  },
  {
    title: "Système",
    items: [
      { title: "Verrouillages", href: "/admin?tab=feature-locks", icon: Lock, tab: "feature-locks" },
      { title: "Historique", href: "/admin?tab=historique", icon: History, tab: "historique" },
      { title: "Données Sensibles", href: "/admin?tab=donnees-sensibles", icon: ShieldAlert, tab: "donnees-sensibles" },
    ]
  }
];

export const AppSidebar = () => {
  const location = useLocation();

  return (
    <div className="w-64 min-w-64 bg-white border-r border-gray-200 flex flex-col min-h-screen">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Administration</h2>
      </div>
      <nav className="flex-1 p-4 space-y-4">
        {menuSections.map((section, index) => (
          <div key={index} className="space-y-1">
            {section.title && (
              <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">{section.title}</div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;

              return (
                <Link
                  key={item.title}
                  to={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm rounded-lg transition-colors w-full",
                    isActive
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon className={cn("w-5 h-5 mr-3 flex-shrink-0", isActive ? "text-blue-700" : "text-gray-500")} />
                  <span className="truncate">{item.title}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );
};
