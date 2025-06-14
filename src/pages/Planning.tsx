
import { UCLouvainHeader } from "@/components/UCLouvainHeader";
import { Footer } from "@/components/Footer";
import { PlanningGlobal } from "@/components/PlanningGlobal";

const PlanningPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <UCLouvainHeader />
      <main className="flex-1 container mx-auto px-2 py-6">
        <PlanningGlobal />
      </main>
      <Footer />
    </div>
  );
};

export default PlanningPage;
