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
  MapPin,
  Clock,
  Target,
  MessageSquare,
  Building,
  Key,
  CheckCircle,
  Search
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

export function AdminSidebar() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const currentTab = params.get("tab");
  const pathname = location.pathname;

  const isActiveTab = (tab: string) => {
    return currentTab === tab;
  };

  const isActiveSection = (path: string) => {
    return pathname === path;
  };

  return (
    <div className="h-full w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Administration</h2>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {/* Dashboard */}
        <Link
          to="/admin"
          className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            pathname === "/admin" && !currentTab
              ? "bg-uclouvain-blue text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Tableau de bord</span>
          </div>
        </Link>

        {/* Examens & Planning */}
        <div className="space-y-1">
          <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Examens & Planning
          </h3>
          
          <Link
            to="/admin?tab=examens"
            className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActiveTab("examens")
                ? "bg-uclouvain-blue text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Gestion examens</span>
            </div>
          </Link>

          <Link
            to="/admin?tab=planning"
            className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActiveTab("planning")
                ? "bg-uclouvain-blue text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Planning</span>
            </div>
          </Link>

          <Link
            to="/admin?tab=validations"
            className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActiveTab("validations")
                ? "bg-uclouvain-blue text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center space-x-2">
              <CheckSquare className="h-4 w-4" />
              <span>Validations</span>
            </div>
          </Link>
        </div>

        {/* Surveillants */}
        <div className="space-y-1">
          <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Surveillance
          </h3>
          
          <Link
            to="/admin?tab=surveillants"
            className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActiveTab("surveillants")
                ? "bg-uclouvain-blue text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Surveillants</span>
            </div>
          </Link>

          <Link
            to="/admin/disponibilites"
            className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActiveSection("/admin/disponibilites") || pathname.startsWith("/admin/disponibilites")
                ? "bg-uclouvain-blue text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Disponibilités</span>
            </div>
          </Link>

          <Link
            to="/admin?tab=pre-assignations"
            className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActiveTab("pre-assignations")
                ? "bg-uclouvain-blue text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>Pré-assignations</span>
            </div>
          </Link>

          <Link
            to="/admin/demandes-specifiques"
            className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActiveSection("/admin/demandes-specifiques")
                ? "bg-uclouvain-blue text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>Demandes spécifiques</span>
            </div>
          </Link>
        </div>

        {/* Configuration */}
        <div className="space-y-1">
          <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Configuration
          </h3>
          
          <Link
            to="/admin?tab=contraintes"
            className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActiveTab("contraintes")
                ? "bg-uclouvain-blue text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center space-x-2">
              <Building className="h-4 w-4" />
              <span>Contraintes auditoires</span>
            </div>
          </Link>

          <Link
            to="/admin?tab=feature-locks"
            className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActiveTab("feature-locks")
                ? "bg-uclouvain-blue text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center space-x-2">
              <Lock className="h-4 w-4" />
              <span>Verrouillage fonctions</span>
            </div>
          </Link>

          <Link
            to="/admin?tab=gestion-utilisateurs"
            className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActiveTab("gestion-utilisateurs")
                ? "bg-uclouvain-blue text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Gestion utilisateurs</span>
            </div>
          </Link>
        </div>

        {/* Enseignants */}
        <div className="space-y-1">
          <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Enseignants
          </h3>
          
          <Link
            to="/admin?tab=tokens-enseignants"
            className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActiveTab("tokens-enseignants")
                ? "bg-uclouvain-blue text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center space-x-2">
              <Key className="h-4 w-4" />
              <span>Tokens enseignants</span>
            </div>
          </Link>

          <Link
            to="/admin?tab=suivi-confirm-enseignants"
            className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActiveTab("suivi-confirm-enseignants")
                ? "bg-uclouvain-blue text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4" />
              <span>Suivi confirmations</span>
            </div>
          </Link>
        </div>

        {/* Données & Sécurité */}
        <div className="space-y-1">
          <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Données & Sécurité
          </h3>
          
          <Link
            to="/admin?tab=controles-verifications"
            className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActiveTab("controles-verifications")
                ? "bg-uclouvain-blue text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4" />
              <span>Contrôles & Vérifications</span>
            </div>
          </Link>

          <Link
            to="/admin?tab=historique"
            className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActiveTab("historique")
                ? "bg-uclouvain-blue text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center space-x-2">
              <History className="h-4 w-4" />
              <span>Historique</span>
            </div>
          </Link>

          <Link
            to="/admin?tab=donnees-sensibles"
            className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActiveTab("donnees-sensibles")
                ? "bg-uclouvain-blue text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span>Données sensibles</span>
            </div>
          </Link>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Plateforme de gestion des surveillances d'examens
        </p>
      </div>
    </div>
  );
}
