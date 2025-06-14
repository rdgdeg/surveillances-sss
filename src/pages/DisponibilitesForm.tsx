
import { CollecteDisponibilites } from "@/components/CollecteDisponibilites";
import { Footer } from "@/components/Footer";
import { UCLouvainHeader } from "@/components/UCLouvainHeader";

const DisponibilitesForm = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <UCLouvainHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <CollecteDisponibilites />
      </main>
      <Footer />
    </div>
  );
};

export default DisponibilitesForm;
