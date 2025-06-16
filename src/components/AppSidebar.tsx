
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Users,
  Calendar,
  ClipboardList,
  FileText,
  Settings,
  Clock,
  CheckCircle,
  Grid3X3,
  Eye,
  Home,
  UserPlus,
  History,
  Shield,
  MapPin,
  Code2,
  Lock,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const menu = [
  {
    label: "Sessions",
    icon: Calendar,
    route: "/admin", // ou /sessions si diferente
    exact: true,
  },
  {
    label: "Examens",
    icon: FileText,
    children: [
      { label: "Import & Révision", icon: FileText, route: "/admin?tab=examens" },
      { label: "Import Codes Auto", icon: Code2, route: "/admin?tab=import-codes" },
      { label: "Workflow Validation", icon: CheckCircle, route: "/admin?tab=validations" },
      { label: "Vue Enseignant", icon: Eye, route: "/admin?tab=enseignant-view" },
      { label: "Liens Enseignants", icon: UserPlus, route: "/admin?tab=tokens-enseignants" },
      { label: "Planning & Attribution", icon: Calendar, route: "/admin?tab=planning" },
    ]
  },
  {
    label: "Surveillants",
    icon: Users,
    children: [
      { label: "Liste Surveillants", icon: Users, route: "/admin?tab=surveillants" },
    ]
  },
  {
    label: "Disponibilités & suivi",
    icon: ClipboardList,
    children: [
      { label: "Disponibilités envoyées", icon: UserPlus, route: "/admin?tab=candidatures" },
      { label: "Collecte Disponibilités", icon: Clock, route: "/admin?tab=disponibilites" },
      { label: "Matrice Disponibilités", icon: Grid3X3, route: "/admin?tab=matrice-disponibilites" },
      { label: "Suivi Disponibilités", icon: ClipboardList, route: "/admin?tab=suivi-disponibilites" },
      { label: "Suivi Confirms Enseignants", icon: CheckCircle, route: "/admin?tab=suivi-confirm-enseignants" }
    ]
  },
  {
    label: "Configuration",
    icon: Settings,
    children: [
      { label: "Contraintes Auditoires", icon: MapPin, route: "/admin?tab=contraintes" },
      { label: "Pré-assignations", icon: Shield, route: "/admin?tab=pre-assignations" },
      { label: "Verrouillage Fonctionnalités", icon: Lock, route: "/admin?tab=feature-locks" }
    ]
  },
  {
    label: "Suivi & Historique",
    icon: History,
    children: [
      { label: "Historique", icon: History, route: "/admin?tab=historique" },
      { label: "Données Sensibles", icon: Eye, route: "/admin?tab=donnees-sensibles" }
    ]
  }
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (route: string) => {
    // Simple matching, improve if you want more precise current tab detection
    return location.search.includes(route.split("?tab=")[1] || "");
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 font-bold text-uclouvain-blue text-lg">
          <ClipboardList className="w-6 h-6" />
          Admin
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Page d'accueil admin */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === "/admin" && !location.search}
                  onClick={() => navigate("/admin")}
                >
                  <Home className="w-4 h-4" />
                  <span>Accueil</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Sections dynamiques */}
              {menu.map((section) =>
                section.children ? (
                  <div key={section.label}>
                    <div className="font-semibold text-xs text-gray-500 mt-4 px-2">
                      <section.icon className="w-3 h-3 mr-1 inline" />
                      {section.label}
                    </div>
                    {section.children.map((child) => (
                      <SidebarMenuItem key={child.label}>
                        <SidebarMenuButton
                          isActive={isActive(child.route)}
                          onClick={() => navigate(child.route)}
                        >
                          <child.icon className="w-4 h-4" />
                          <span>{child.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </div>
                ) : (
                  <SidebarMenuItem key={section.label}>
                    <SidebarMenuButton
                      isActive={isActive(section.route)}
                      onClick={() => navigate(section.route)}
                    >
                      <section.icon className="w-4 h-4" />
                      <span>{section.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="py-4">
        <SidebarTrigger />
      </SidebarFooter>
    </Sidebar>
  );
}
