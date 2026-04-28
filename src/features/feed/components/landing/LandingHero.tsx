import { useState } from "react";
import { useNavigate } from "react-router";
import { DiscoverySearchInput } from "@/features/search/components/DiscoverySearchInput";
import { motion } from "framer-motion";

export const LandingHero = () => {
  const [searchValue, setSearchValue] = useState("");
  const navigate = useNavigate();

  const handleLocationSelect = (location: { lat: number; lng: number }) => {
    navigate(`/search?lat=${location.lat}&lng=${location.lng}`);
  };

  const handleSearchSubmit = () => {
    if (searchValue.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchValue)}`);
    }
  };

  return (
    <div className="w-full min-h-[80vh] py-24 md:py-32 flex flex-col items-center justify-center space-y-10">
      {/* Typography */}
      <motion.div
        className="w-full max-w-4xl px-4 flex flex-col items-center text-center space-y-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <h1 className="text-3xl md:text-7xl font-bold tracking-tight text-text-primary leading-tight">
          The world's architecture,{" "}
          <br className="hidden md:block" />
          cataloged.
        </h1>
        <p className="text-lg md:text-xl text-text-secondary max-w-xl">
          Track visits, rate buildings, and follow friends.
        </p>
      </motion.div>

      {/* Search */}
      <motion.div
        className="w-full max-w-lg px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.15 }}
      >
        <div className="border-b border-border-default">
          <DiscoverySearchInput
            value={searchValue}
            onSearchChange={setSearchValue}
            onLocationSelect={handleLocationSelect}
            placeholder="Search for a city, building, or architect..."
            className="w-full [&_input]:bg-transparent [&_input]:border-none [&_input]:focus-visible:ring-0 [&_input]:text-base [&_input]:h-12 [&_input]:placeholder:text-text-secondary/70"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearchSubmit();
              }
            }}
          />
        </div>
      </motion.div>

      {/* Subtle CTA */}
      <motion.button
        onClick={() => navigate("/search")}
        className="text-xs font-medium uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        Explore nearby →
      </motion.button>
    </div>
  );
};
