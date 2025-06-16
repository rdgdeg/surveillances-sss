
import { AdminLayout } from "@/components/AdminLayout";
import { DisponibilitesAdminView } from "@/components/DisponibilitesAdminView";

const AdminDisponibilites = () => {
  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-6">
        <div className="w-full">
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Disponibilités</h1>
          <p className="text-gray-600 mt-2">
            Visualisez et gérez toutes les disponibilités reçues des surveillants.
          </p>
        </div>
        <div className="w-full">
          <DisponibilitesAdminView />
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDisponibilites;
