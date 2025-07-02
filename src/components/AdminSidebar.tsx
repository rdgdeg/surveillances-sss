
import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Calendar,
  FileSpreadsheet,
  Users,
  Clock,
  Target,
  MessageSquare,
  UserCog,
  CheckCircle,
  Settings,
  Building,
  Lock,
  Shield,
  Search,
  CalendarDays
} from "lucide-react";
import { AdminSearchBar } from "./AdminSearchBar";

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
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Administration</h2>
        <AdminSearchBar />
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
            <LayoutDashboard className="h-4 w-4" />
            <span>Tableau de bord</span>
          </div>
        </Link>

        {/* 🏗️ Configuration */}
        <div className="space-y-1">
          <h3 className="px-3 py-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
            🏗️ Configuration
          </h3>
          
          <Link
            to="/admin?tab=examens"
            className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActiveTab("examens")
                ? "bg-uclouvain-blue text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Gestion examens</span>
              </div>
            </div>
            <div className="text-xs text-gray-500 ml-6 mt-1">Import, édition, activation</div>
          </Link>

          <Link
            to="/admin?tab=controles-verifications"
            className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActiveTab("controles-verifications")
                ? "bg-uclouvain-blue text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Créneaux & Planning</span>
            </div>
          </Link>

          <Link
            to="/admin/templates"
            className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActiveSection("/admin/templates")
                ? "bg-uclouvain-blue text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="h-4 w-4" />
              <span>Templates & Import</span>
            </div>
          </Link>

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
        </div>

        {/* ✅ Validation */}
        <div className="space-y-1">
          <h3 className="px-3 py-2 text-xs font-semibold text-green-600 uppercase tracking-wider">
            ✅ Validation
          </h3>
          
          <Link
            to="/admin?tab=planning"
            className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActiveTab("planning") || isActiveTab("validations")
                ? "bg-uclouvain-blue text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Validation examens</span>
              </div>
            </div>
            <div className="text-xs text-gray-500 ml-6 mt-1">Contrôle codes, types, statuts</div>
          </Link>
          
          <Link
            to="/admin/creneaux-surveillance"
            className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              pathname === "/admin/creneaux-surveillance"
                ? "bg-uclouvain-blue text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Créneaux Surveillance</span>
            </div>
          </Link>

          <Link
            to="/admin?tab=enseignant-view"
            className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActiveTab("enseignant-view")
                ? "bg-uclouvain-blue text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center space-x-2">
              <UserCog className="h-4 w-4" />
              <span>Vue Enseignant</span>
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

        {/* 👥 Surveillance */}
        <div className="space-y-1">
          <h3 className="px-3 py-2 text-xs font-semibold text-purple-600 uppercase tracking-wider">
            👥 Surveillance
          </h3>
          
          <Link
            to="/admin/disponibilites"
            className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActiveSection("/admin/disponibilites") || pathname.startsWith("/admin/disponibilites")
                ? "bg-uclouvain-blue text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Disponibilités</span>
              </div>
            </div>
            <div className="text-xs text-gray-500 ml-6 mt-1">Suivi collecte, matrice, stats</div>
          </Link>

          <Link
            to="/admin?tab=surveillants"
            className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActiveTab("surveillants")
                ? "bg-uclouvain-blue text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Surveillants</span>
              </div>
            </div>
            <div className="text-xs text-gray-500 ml-6 mt-1">Gestion, quotas, sessions</div>
          </Link>

          <Link
            to="/admin?tab=pre-assignations"
            className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActiveTab("pre-assignations")
                ? "bg-uclouvain-blue text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4" />
                <span>Attributions</span>
              </div>
            </div>
            <div className="text-xs text-gray-500 ml-6 mt-1">Attribution automatique/manuelle</div>
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

        {/* ⚙️ Administration */}
        <div className="space-y-1">
          <h3 className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
            ⚙️ Administration
          </h3>
          
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
              <span>Verrouillages</span>
            </div>
          </Link>

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
              <span>Vérifications qualité</span>
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
