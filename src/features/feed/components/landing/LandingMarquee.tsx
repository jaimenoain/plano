import { motion } from "framer-motion";

const CREDITS = [
  { building: "Fallingwater", architect: "Frank Lloyd Wright" },
  { building: "Heydar Aliyev Center", architect: "Zaha Hadid Architects" },
  { building: "The Shard", architect: "Renzo Piano Building Workshop" },
  { building: "Tate Modern", architect: "Herzog & de Meuron" },
  { building: "CCTV Headquarters", architect: "OMA / Rem Koolhaas" },
  { building: "Sagrada Família", architect: "Antoni Gaudí" },
  { building: "Nakagin Capsule Tower", architect: "Kisho Kurokawa" },
  { building: "Jewish Museum Berlin", architect: "Daniel Libeskind" },
  { building: "Seagram Building", architect: "Mies van der Rohe" },
  { building: "Louvre Pyramid", architect: "I.M. Pei" },
];

export const LandingMarquee = () => {
  return (
    <div className="w-0 min-w-full overflow-hidden border-t border-border-default py-4">
      <div className="relative flex w-full items-center">
        <motion.div
          className="flex flex-nowrap gap-0"
          animate={{ x: "-50%" }}
          transition={{
            repeat: Infinity,
            ease: "linear",
            duration: 40,
          }}
          style={{ width: "max-content" }}
        >
          {[...CREDITS, ...CREDITS].map((item, index) => (
            <div
              key={`${item.building}-${index}`}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <span className="text-xs text-text-secondary">
                <span className="font-medium text-text-primary">{item.building}</span>
                <span className="text-text-disabled mx-1.5">by</span>
                {item.architect}
              </span>
              <span className="mx-7 text-text-disabled text-xs">·</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};
