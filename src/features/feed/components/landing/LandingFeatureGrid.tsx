import { Building2, Users, MapPin } from "lucide-react";

const features = [
  {
    tag: "Discover",
    icon: Building2,
    title: "Every building, documented.",
    description:
      "Browse thousands of buildings across every city, style, and era. Search by architect, movement, material, or location.",
    items: [
      { label: "Bauhaus", meta: "Movement" },
      { label: "Tadao Ando", meta: "Architect" },
      { label: "Brutalism", meta: "Style" },
    ],
  },
  {
    tag: "Credit",
    icon: Users,
    title: "Architects get the credit they deserve.",
    description:
      "Every building attributed to the architects, engineers, and studios behind it. A permanent record of who made what.",
    items: [
      { label: "Renzo Piano", meta: "223 buildings" },
      { label: "Zaha Hadid Architects", meta: "Studio · 89 buildings" },
      { label: "Arup", meta: "Engineering · 1,400+ projects" },
    ],
  },
  {
    tag: "Track",
    icon: MapPin,
    title: "Your architecture journey.",
    description:
      "Log every building you visit. Rate them, collect favorites, and follow the architects whose work inspires you.",
    items: [
      { label: "Fallingwater", meta: "Visited" },
      { label: "Unité d'Habitation", meta: "Want to visit" },
      { label: "Barbican Centre", meta: "In 'Brutalist Gems'" },
    ],
  },
];

export const LandingFeatureGrid = () => {
  return (
    <div className="grid grid-cols-1 gap-16 md:grid-cols-3 md:gap-10 lg:gap-[2.5rem]">
      {features.map(({ tag, icon: Icon, title, description, items }) => (
        <div key={tag} className="space-y-8">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-text-disabled" strokeWidth={1.5} />
              <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-text-disabled">
                {tag}
              </p>
            </div>
            <h3 className="text-xl font-bold tracking-tight text-text-primary leading-snug">
              {title}
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
          </div>

          {/* Example rows */}
          <div className="space-y-0">
            {items.map(({ label, meta }, i) => (
              <div
                key={label}
                className="flex items-center justify-between border-b border-border-default py-3"
                style={{ opacity: 1 - i * 0.28 }}
              >
                <span className="text-sm font-medium text-text-primary">{label}</span>
                <span className="text-xs text-text-disabled">{meta}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
