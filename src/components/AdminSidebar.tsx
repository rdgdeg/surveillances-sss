
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Upload,
  CheckCircle2,
  Settings,
  UserPlus,
  Lock,
  Clock,
  BarChart4,
  ListChecks,
  Calculator,
  MessageSquare,
  Building2,
  ClipboardList,
  Users
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface AdminSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export const AdminSidebar = ({ activeView, onViewChange }: AdminSidebarProps) => {
  return (
    <Sidebar>
      <SidebarContent>
        {/* Configuration de base */}
        <SidebarGroup>
          <SidebarGroupLabel>Configuration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onViewChange("sessions")}
                  isActive={activeView === "sessions"}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Sessions</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onViewChange("templates")}
                  isActive={activeView === "templates"}
                >
                  <FileText className="h-4 w-4" />
                  <span>Templates</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onViewChange("surveillant-creator")}
                  isActive={activeView === "surveillant-creator"}
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Créer Surveillants</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Import et traitement */}
        <SidebarGroup>
          <SidebarGroupLabel>Import & Traitement</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onViewChange("import")}
                  isActive={activeView === "import"}
                >
                  <Upload className="h-4 w-4" />
                  <span>Import</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onViewChange("cally-import")}
                  isActive={activeView === "cally-import"}
                >
                  <Clock className="h-4 w-4" />
                  <span>Import Cally</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onViewChange("candidats-surveillance")}
                  isActive={activeView === "candidats-surveillance"}
                >
                  <Users className="h-4 w-4" />
                  <span>Candidats Surveillance</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onViewChange("consistency")}
                  isActive={activeView === "consistency"}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Cohérence</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Gestion des contraintes */}
        <SidebarGroup>
          <SidebarGroupLabel>Contraintes</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onViewChange("constraints")}
                  isActive={activeView === "constraints"}
                >
                  <ListChecks className="h-4 w-4" />
                  <span>Contraintes par Salle</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onViewChange("contraintes-auditoires")}
                  isActive={activeView === "contraintes-auditoires"}
                >
                  <Building2 className="h-4 w-4" />
                  <span>Contraintes Auditoires</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onViewChange("availability")}
                  isActive={activeView === "availability"}
                >
                  <Calendar className="h-4 w-4" />
                  <span>Disponibilités</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Attribution et planification */}
        <SidebarGroup>
          <SidebarGroupLabel>Attribution</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onViewChange("examen-review")}
                  isActive={activeView === "examen-review"}
                >
                  <ClipboardList className="h-4 w-4" />
                  <span>Révision Examens</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onViewChange("pre-assignments")}
                  isActive={activeView === "pre-assignments"}
                >
                  <Lock className="h-4 w-4" />
                  <span>Pré-assignations</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onViewChange("assignment")}
                  isActive={activeView === "assignment"}
                >
                  <Settings className="h-4 w-4" />
                  <span>Attribution</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onViewChange("planning")}
                  isActive={activeView === "planning"}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Planning</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Suivi et gestion */}
        <SidebarGroup>
          <SidebarGroupLabel>Suivi</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onViewChange("soldes")}
                  isActive={activeView === "soldes"}
                >
                  <Calculator className="h-4 w-4" />
                  <span>Soldes</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onViewChange("demandes")}
                  isActive={activeView === "demandes"}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Demandes</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onViewChange("history")}
                  isActive={activeView === "history"}
                >
                  <BarChart4 className="h-4 w-4" />
                  <span>Historique</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
