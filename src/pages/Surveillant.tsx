
import { SimpleSurveillantAvailabilityForm } from "@/components/SimpleSurveillantAvailabilityForm";
import { Footer } from "@/components/Footer";
import { UCLouvainHeader } from "@/components/UCLouvainHeader";

const Surveillant = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <UCLouvainHeader />
      <main className="flex-1 container mx-auto px-4 py-8 space-y-8">
        <SimpleSurveillantAvailabilityForm />
      </main>
      <Footer />
    </div>
  );
};

export default Surveillant;
