import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { D as Dialog, aa as DialogPortal, ab as DialogOverlay, c as DialogContent, e as DialogTitle, u as useToast, d as DialogHeader, f as DialogDescription, L as Label, I as Input, ac as SegmentedControl, g as DialogFooter, B as Button, s as supabase } from "./server-build-1ZWwoAkP.js";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import "@vercel/react-router/entry.server";
import "react-router";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
import "@tanstack/react-query";
import "@radix-ui/react-tooltip";
import "@radix-ui/react-toast";
import "next-themes";
import "sonner";
import "@supabase/ssr";
import "vaul";
import "react-error-boundary";
import "@sentry/react";
import "@radix-ui/react-separator";
import "@radix-ui/react-dialog";
import "@radix-ui/react-label";
import "@radix-ui/react-checkbox";
import "@radix-ui/react-avatar";
import "zod";
import "use-places-autocomplete";
import "@googlemaps/js-api-loader";
import "cmdk";
import "@radix-ui/react-scroll-area";
import "@radix-ui/react-alert-dialog";
import "@radix-ui/react-radio-group";
import "react-dom";
import "maplibre-gl";
import "embla-carousel-react";
import "recharts";
import "@radix-ui/react-toggle-group";
import "@radix-ui/react-toggle";
import "date-fns";
import "@radix-ui/react-tabs";
import "@radix-ui/react-switch";
import "@radix-ui/react-select";
import "@radix-ui/react-dropdown-menu";
import "@radix-ui/react-popover";
import "@radix-ui/react-slider";
import "@radix-ui/react-accordion";
import "@dnd-kit/core";
import "@dnd-kit/sortable";
import "@dnd-kit/utilities";
import "@radix-ui/react-hover-card";
import "zustand";
import "react-hook-form";
import "@hookform/resolvers/zod";
const loadingMessages = [
  "Analyzing geographical zones...",
  "Charting the perfect route...",
  "Optimizing travel times..."
];
function ItineraryGenerationOverlay({ open }) {
  const [messageIndex, setMessageIndex] = useState(0);
  useEffect(() => {
    if (!open) {
      setMessageIndex(0);
      return void 0;
    }
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2e3);
    return () => clearInterval(interval);
  }, [open]);
  return /* @__PURE__ */ jsx(Dialog, { open, children: /* @__PURE__ */ jsxs(DialogPortal, { children: [
    /* @__PURE__ */ jsx(DialogOverlay, { className: "z-[1200] bg-black/60 backdrop-blur-sm" }),
    /* @__PURE__ */ jsxs(
      DialogContent,
      {
        className: "z-[1200] flex items-center justify-center w-full h-full max-w-none border-none bg-transparent shadow-none sm:max-w-none",
        hideCloseButton: true,
        onOpenAutoFocus: (e) => e.preventDefault(),
        children: [
          /* @__PURE__ */ jsx(DialogTitle, { className: "sr-only", children: "Generating Itinerary" }),
          /* @__PURE__ */ jsxs("div", { className: "bg-surface-card rounded-lg shadow-lg border border-border-default p-8 flex flex-col items-center justify-center max-w-md w-full mx-4", children: [
            /* @__PURE__ */ jsx("div", { className: "relative w-48 h-48 flex items-center justify-center", children: /* @__PURE__ */ jsxs(
              motion.svg,
              {
                viewBox: "0 0 100 100",
                className: "w-full h-full overflow-visible",
                children: [
                  [
                    { cx: 20, cy: 80 },
                    { cx: 40, cy: 30 },
                    { cx: 70, cy: 60 },
                    { cx: 90, cy: 20 }
                  ].map((dot, i) => /* @__PURE__ */ jsx(
                    motion.circle,
                    {
                      cx: dot.cx,
                      cy: dot.cy,
                      r: "2",
                      fill: "currentColor",
                      className: "text-brand-primary",
                      initial: { opacity: 0, scale: 0 },
                      animate: { opacity: 1, scale: 1 },
                      transition: { delay: i * 0.3, duration: 0.5 }
                    },
                    i
                  )),
                  /* @__PURE__ */ jsx(
                    motion.path,
                    {
                      d: "M 20 80 L 40 30 L 70 60 L 90 20",
                      fill: "none",
                      stroke: "currentColor",
                      strokeWidth: "1.5",
                      className: "text-brand-primary",
                      initial: { pathLength: 0, opacity: 0 },
                      animate: { pathLength: 1, opacity: 1 },
                      transition: {
                        duration: 2.5,
                        ease: "easeInOut",
                        repeat: Infinity,
                        repeatType: "loop",
                        repeatDelay: 0.5
                      }
                    }
                  )
                ]
              }
            ) }),
            /* @__PURE__ */ jsx("div", { className: "h-8 mt-6 flex items-center justify-center w-full max-w-md px-2", children: /* @__PURE__ */ jsx(AnimatePresence, { mode: "wait", children: /* @__PURE__ */ jsx(
              motion.p,
              {
                initial: { opacity: 0, y: 10 },
                animate: { opacity: 1, y: 0 },
                exit: { opacity: 0, y: -10 },
                transition: { duration: 0.3 },
                className: "text-lg font-semibold text-center text-text-primary",
                children: loadingMessages[messageIndex]
              },
              messageIndex
            ) }) })
          ] })
        ]
      }
    )
  ] }) });
}
function PlanRouteDialog({
  open,
  onOpenChange,
  collectionId,
  onPlanGenerated,
  hasItinerary
}) {
  const { toast } = useToast();
  const [days, setDays] = useState(3);
  const [transportMode, setTransportMode] = useState("walking");
  const [isLoading, setIsLoading] = useState(false);
  const handleDelete = async () => {
    if (!collectionId) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from("collections").update({ itinerary: null }).eq("id", collectionId);
      if (error) throw error;
      toast({
        title: "Itinerary Removed",
        description: "The itinerary has been successfully removed."
      });
      onOpenChange(false);
      if (onPlanGenerated) {
        onPlanGenerated("removed");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove itinerary.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!collectionId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-itinerary", {
        body: {
          collection_id: collectionId,
          days: Number(days),
          transportMode
        }
      });
      if (error) throw error;
      if (data && data.error) {
        throw new Error(data.error);
      }
      toast({
        title: "Itinerary Generated",
        description: "Your route has been successfully planned."
      });
      onOpenChange(false);
      if (onPlanGenerated) {
        onPlanGenerated("created");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate itinerary. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  return /* @__PURE__ */ jsxs(Dialog, { open, onOpenChange, children: [
    /* @__PURE__ */ jsx(ItineraryGenerationOverlay, { open: isLoading }),
    /* @__PURE__ */ jsxs(DialogContent, { className: "sm:max-w-[425px]", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: "✨ Plan Route" }),
        /* @__PURE__ */ jsx(DialogDescription, { children: "Optimize your trip by selecting the number of days and your preferred mode of transport." })
      ] }),
      /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-6 py-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "days", children: "Number of Days" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "days",
              type: "number",
              min: 1,
              max: 14,
              value: days,
              onChange: (e) => setDays(parseInt(e.target.value) || 1),
              required: true
            }
          ),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-text-secondary", children: "Select between 1 and 14 days for your itinerary." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { children: "Transport Mode" }),
          /* @__PURE__ */ jsx(
            SegmentedControl,
            {
              value: transportMode,
              onValueChange: setTransportMode,
              options: [
                { label: "Walking", value: "walking" },
                { label: "Cycling", value: "cycling" },
                { label: "Driving", value: "driving" }
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs(DialogFooter, { className: "flex-col sm:justify-between sm:space-x-0", children: [
          hasItinerary && /* @__PURE__ */ jsx(
            Button,
            {
              type: "button",
              variant: "link",
              onClick: handleDelete,
              disabled: isLoading,
              className: "mb-2 sm:mb-0 text-feedback-destructive hover:text-feedback-destructive/90",
              children: "Remove Itinerary"
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-2 justify-end w-full sm:w-auto", children: [
            /* @__PURE__ */ jsx(
              Button,
              {
                type: "button",
                variant: "outline",
                onClick: () => onOpenChange(false),
                disabled: isLoading,
                children: "Cancel"
              }
            ),
            /* @__PURE__ */ jsx(Button, { type: "submit", disabled: isLoading, children: isLoading ? /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
              "Generating..."
            ] }) : "Generate Itinerary" })
          ] })
        ] })
      ] })
    ] })
  ] });
}
export {
  PlanRouteDialog
};
