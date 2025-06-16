
import { AdminLayout } from "@/components/AdminLayout";
import { DisponibilitesAdminView } from "@/components/DisponibilitesAdminView";

const AdminDisponibilites = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Disponibilités</h1>
          <p className="text-muted-foreground">
            Visualisez et gérez toutes les disponibilités reçues des surveillants.
          </p>
        </div>
        <DisponibilitesAdminView />
      </div>
    </AdminLayout>
  );
};

export default AdminDisponibilites;
