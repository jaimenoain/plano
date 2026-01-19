import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { MetaHead } from "@/components/common/MetaHead";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MetaHead title="404 - Page Not Found" />
      <Header showLogo={true} />

      {/* Main Content - Centered */}
      <div className="flex-1 flex items-center justify-center p-6 pt-20">
        <div className="max-w-md w-full flex flex-col items-center text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">

          {/* Illustration */}
          <div className="relative w-full max-w-[320px] mx-auto">
            <img
              src="/404.png"
              alt="Star Wars Scene"
              className="w-full h-auto opacity-90"
            />
          </div>

          {/* Text Content */}
          <div className="space-y-4">
             <h2 className="text-sm md:text-base text-muted-foreground font-medium uppercase tracking-widest">
                404 Error: Page Not Found
             </h2>

             <div className="space-y-2">
               <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
                  "These aren't the droids you're looking for."
               </h1>
               <p className="text-sm text-muted-foreground/60 italic">
                  — Star Wars: Episode IV – A New Hope (1977)
               </p>
             </div>
          </div>

          {/* Action */}
          <div className="pt-2">
            <Button asChild size="lg" className="min-w-[160px]">
                <Link to="/">Return to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
