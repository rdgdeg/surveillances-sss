
import { Footer } from "@/components/Footer";
import { UCLouvainHeader } from "@/components/UCLouvainHeader";
import { useParams } from "react-router-dom";

const EnseignantToken = () => {
  const { token } = useParams<{ token: string }>();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 w-full">
      <UCLouvainHeader />
      <main className="flex-1 w-full px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Place the main token form/content here */}
          {/* <EnseignantTokenContent token={token} /> */}
          <div className="text-center text-xl text-uclouvain-blue">
            Page enseignant: token = <span className="font-mono">{token}</span>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EnseignantToken;
