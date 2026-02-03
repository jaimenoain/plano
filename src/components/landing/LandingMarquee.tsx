import React from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const MOCK_ACTIVITIES = [
  {
    id: 1,
    user: "Alice",
    avatar: "https://i.pravatar.cc/150?u=alice",
    action: "rated",
    target: "The Shard",
    details: "5★",
  },
  {
    id: 2,
    user: "Bob",
    avatar: "https://i.pravatar.cc/150?u=bob",
    action: "liked",
    target: "Villa Savoye",
    details: "",
  },
  {
    id: 3,
    user: "Charlie",
    avatar: "https://i.pravatar.cc/150?u=charlie",
    action: "added",
    target: "Fallingwater",
    details: "to 'Brutalist Gems'",
  },
  {
    id: 4,
    user: "Dana",
    avatar: "https://i.pravatar.cc/150?u=dana",
    action: "visited",
    target: "Guggenheim Museum",
    details: "",
  },
  {
    id: 5,
    user: "Eve",
    avatar: "https://i.pravatar.cc/150?u=eve",
    action: "rated",
    target: "Sydney Opera House",
    details: "4.5★",
  },
];

export const LandingMarquee = () => {
  return (
    <div className="w-full overflow-hidden border-y border-border bg-background py-3">
      <div className="relative flex w-full max-w-[100vw] items-center">
        <motion.div
          className="flex flex-nowrap gap-0"
          animate={{ x: "-50%" }}
          transition={{
            repeat: Infinity,
            ease: "linear",
            duration: 30, // Adjust speed here
          }}
          style={{ width: "max-content" }}
        >
          {/* Double the list to create seamless loop */}
          {[...MOCK_ACTIVITIES, ...MOCK_ACTIVITIES].map((activity, index) => (
            <div
              key={`${activity.id}-${index}`}
              className="flex items-center gap-3 whitespace-nowrap"
            >
              <Avatar className="h-6 w-6 border border-border">
                <AvatarImage src={activity.avatar} alt={activity.user} />
                <AvatarFallback>{activity.user[0]}</AvatarFallback>
              </Avatar>
              <span className="text-sm">
                <span className="font-medium">{activity.user}</span> {activity.action}{" "}
                <span className="font-medium">{activity.target}</span> {activity.details}
              </span>
              <span className="mx-8 text-primary">+</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};
