
import { PlanningGeneralProtected } from '@/components/PlanningGeneralProtected';
import { UCLouvainHeader } from "@/components/UCLouvainHeader";

const PlanningGeneral = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 w-full">
      <UCLouvainHeader />
      <main className="flex-1 w-full">
        <PlanningGeneralProtected />
      </main>
    </div>
  );
};

export default PlanningGeneral;
