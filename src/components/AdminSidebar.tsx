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
  ListChecks
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarItem,
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
                  onClick={() => onViewChange("import")}
                  isActive={activeView === "import"}
                >
                  <Upload className="h-4 w-4" />
                  <span>Import</span>
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

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onViewChange("consistency")}
                  isActive={activeView === "consistency"}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Cohérence</span>
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
                  onClick={() => onViewChange("availability")}
                  isActive={activeView === "availability"}
                >
                  <Calendar className="h-4 w-4" />
                  <span>Disponibilités</span>
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
                  onClick={() => onViewChange("pre-assignments")}
                  isActive={activeView === "pre-assignments"}
                >
                  <Lock className="h-4 w-4" />
                  <span>Pré-assignations</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onViewChange("constraints")}
                  isActive={activeView === "constraints"}
                >
                  <ListChecks className="h-4 w-4" />
                  <span>Contraintes</span>
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
      </SidebarContent>
    </Sidebar>
  );
};
