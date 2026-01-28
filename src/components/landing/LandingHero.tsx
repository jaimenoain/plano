import { useState } from "react";
import { DiscoverySearchInput } from "@/features/search/components/DiscoverySearchInput";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export const LandingHero = () => {
  const [searchValue, setSearchValue] = useState("");
  const navigate = useNavigate();

  const handleLocationSelect = (location: { lat: number; lng: number }) => {
    navigate(`/search?lat=${location.lat}&lng=${location.lng}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchValue)}`);
    }
  };

  return (
    <div className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1486325212027-8081e485255e?q=80&w=2070&auto=format&fit=crop")',
        }}
      >
        <div className="absolute inset-0 bg-black/40 bg-gradient-to-b from-black/60 via-black/20 to-background/90" />
      </div>

      {/* Content Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-4xl px-4 flex flex-col items-center text-center space-y-8"
      >

        {/* Typography */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white drop-shadow-sm">
            The world's architecture, <br className="hidden md:block" />
            cataloged.
          </h1>
          <p className="text-lg md:text-xl text-white/90 font-medium max-w-2xl mx-auto drop-shadow-sm">
            Track visits, rate buildings, and follow friends.
          </p>
        </div>

        {/* Search Integration */}
        <motion.div
            className="w-full max-w-2xl"
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
        >
          <form onSubmit={handleSearchSubmit} className="relative rounded-xl overflow-hidden shadow-2xl bg-background/80 backdrop-blur-md border border-white/20 p-2">
            <DiscoverySearchInput
              value={searchValue}
              onSearchChange={setSearchValue}
              onLocationSelect={handleLocationSelect}
              placeholder="Search for a city, building, or architect..."
              className="w-full [&_input]:bg-transparent [&_input]:border-none [&_input]:focus-visible:ring-0 [&_input]:text-lg [&_input]:h-12 [&_input]:placeholder:text-muted-foreground/70"
            />
          </form>
        </motion.div>

        {/* The Nudge */}
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
        >
          <Badge
            variant="secondary"
            className="px-4 py-2 h-auto text-sm md:text-base cursor-pointer hover:bg-secondary/80 transition-colors gap-2 bg-white/10 text-white backdrop-blur-sm border-white/20 hover:bg-white/20"
            onClick={() => navigate('/search')}
          >
            <MapPin className="w-4 h-4" />
            <span>Trending near you</span>
          </Badge>
        </motion.div>

      </motion.div>
    </div>
  );
};
