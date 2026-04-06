import { motion } from "framer-motion";

const MOCK_ACTIVITIES = [
  { id: 1, user: "Alice", action: "rated", target: "The Shard", details: "5★" },
  { id: 2, user: "Bob", action: "liked", target: "Villa Savoye", details: "" },
  { id: 3, user: "Charlie", action: "added", target: "Fallingwater", details: "to 'Brutalist Gems'" },
  { id: 4, user: "Dana", action: "visited", target: "Guggenheim Museum", details: "" },
  { id: 5, user: "Eve", action: "rated", target: "Sydney Opera House", details: "4.5★" },
];

export const LandingMarquee = () => {
  return (
    <div className="w-0 min-w-full overflow-hidden border-t border-border-default py-5">
      <div className="relative flex w-full items-center">
        <motion.div
          className="flex flex-nowrap gap-0"
          animate={{ x: "-50%" }}
          transition={{
            repeat: Infinity,
            ease: "linear",
            duration: 30,
          }}
          style={{ width: "max-content" }}
        >
          {[...MOCK_ACTIVITIES, ...MOCK_ACTIVITIES].map((activity, index) => (
            <div
              key={`${activity.id}-${index}`}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <span className="text-xs text-text-secondary">
                <span className="font-medium text-text-primary">{activity.user}</span>{" "}
                {activity.action}{" "}
                <span className="font-medium text-text-primary">{activity.target}</span>{" "}
                {activity.details}
              </span>
              <span className="mx-6 text-text-disabled text-xs">·</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};
