import { Unlock, Ticket, Eye, Lock, Shield, DoorOpen, Users, DollarSign, Store, Search } from "lucide-react";
import { LucideIcon } from "lucide-react";

type AccessLevel = "public" | "private" | "restricted" | "commercial" | null;
type AccessLogistics = "walk-in" | "booking_required" | "tour_only" | "exterior_only" | null;
type AccessCost = "free" | "paid" | "customers_only" | null;

interface AccessSynthesisResult {
    label: string;
    icon: LucideIcon;
    variant: "default" | "secondary" | "outline" | "destructive" | "warning";
}

export function synthesizeAccess(
    level: AccessLevel,
    logistics: AccessLogistics,
    cost: AccessCost
): AccessSynthesisResult {
    // 1. Check for most restrictive overriding states first
    if (level === 'private') {
        if (logistics === 'exterior_only') return { label: 'Private (Exterior Only)', icon: Eye, variant: 'secondary' };
        return { label: 'Private', icon: Lock, variant: 'secondary' };
    }

    if (logistics === 'exterior_only') {
        return { label: 'Exterior Only', icon: Eye, variant: 'secondary' };
    }

    if (level === 'restricted') {
         if (logistics === 'booking_required') return { label: 'Restricted (Booking Required)', icon: Ticket, variant: 'warning' };
         if (logistics === 'tour_only') return { label: 'Restricted (Tour Only)', icon: Ticket, variant: 'warning' };
         return { label: 'Restricted Access', icon: Lock, variant: 'warning' };
    }

    // 2. Commercial Spaces
    if (level === 'commercial') {
         if (cost === 'customers_only') return { label: 'Commercial (Customers Only)', icon: Store, variant: 'outline' };
         if (cost === 'paid') return { label: 'Commercial (Paid Entry)', icon: Ticket, variant: 'outline' };
         if (logistics === 'booking_required') return { label: 'Commercial (Booking Required)', icon: Ticket, variant: 'outline' };
         return { label: 'Commercial Access', icon: DoorOpen, variant: 'outline' };
    }

    // 3. Public Spaces
    if (level === 'public') {
         if (logistics === 'booking_required') return { label: 'Public (Booking Required)', icon: Ticket, variant: 'default' };
         if (logistics === 'tour_only') return { label: 'Public (Tour Only)', icon: Ticket, variant: 'default' };

         if (cost === 'free') {
             return { label: 'Free Public Access', icon: Unlock, variant: 'default' };
         }
         if (cost === 'paid') return { label: 'Public (Paid)', icon: Ticket, variant: 'default' };

         return { label: 'Public Access', icon: Unlock, variant: 'default' };
    }

    // 4. Incomplete data fallbacks based on logistics or cost
    if (logistics === 'walk-in') {
        if (cost === 'free') return { label: 'Free Walk-in', icon: Unlock, variant: 'default' };
        if (cost === 'paid') return { label: 'Paid Walk-in', icon: Ticket, variant: 'default' };
        return { label: 'Walk-in Access', icon: DoorOpen, variant: 'default' };
    }

    if (logistics === 'booking_required') return { label: 'Booking Required', icon: Ticket, variant: 'outline' };
    if (logistics === 'tour_only') return { label: 'Tour Only', icon: Ticket, variant: 'outline' };

    if (cost === 'free') return { label: 'Free Access', icon: Unlock, variant: 'default' };
    if (cost === 'paid') return { label: 'Paid Access', icon: Ticket, variant: 'outline' };
    if (cost === 'customers_only') return { label: 'Customers Only', icon: Store, variant: 'outline' };

    // 5. Default
    return { label: 'Access Unknown', icon: Search, variant: 'secondary' };
}
