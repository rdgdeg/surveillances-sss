
import { AdminLayout } from "@/components/AdminLayout";
import { AvailabilityMatrix } from "@/components/AvailabilityMatrix";

const AdminDisponibilitesMatrice = () => {
  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-6">
        <div className="w-full">
          <h1 className="text-3xl font-bold text-gray-900">Matrice des disponibilités</h1>
          <p className="text-gray-600 mt-2">
            Vue matricielle des disponibilités par surveillant et par créneau.
          </p>
        </div>
        <div className="w-full">
          <AvailabilityMatrix />
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDisponibilitesMatrice;
