import { Key, Lock, EyeOff, Shield, ShieldAlert, DoorOpen, Users, DollarSign, Wallet, Store, MapPin, Search } from "lucide-react";
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
    if (level === 'private' || logistics === 'exterior_only') {
        return { label: 'Exterior Only', icon: EyeOff, variant: 'secondary' };
    }

    if (level === 'restricted') {
         if (logistics === 'tour_only') return { label: 'Tour Only', icon: Users, variant: 'warning' };
         if (logistics === 'booking_required') return { label: 'Booking Required', icon: ShieldAlert, variant: 'warning' };
         return { label: 'Restricted Access', icon: Shield, variant: 'warning' };
    }

    // 2. Commercial Spaces
    if (level === 'commercial') {
         if (cost === 'customers_only') return { label: 'Customers Only', icon: Store, variant: 'outline' };
         if (cost === 'paid') return { label: 'Paid Entry', icon: DollarSign, variant: 'outline' };
         if (logistics === 'booking_required') return { label: 'Booking Required', icon: ShieldAlert, variant: 'outline' };
         return { label: 'Commercial Access', icon: DoorOpen, variant: 'outline' };
    }

    // 3. Public Spaces
    if (level === 'public') {
         if (logistics === 'booking_required') return { label: 'Public (Booking Required)', icon: ShieldAlert, variant: 'default' };
         if (logistics === 'tour_only') return { label: 'Public Tours', icon: Users, variant: 'default' };

         if (cost === 'free') {
             if (logistics === 'walk-in') return { label: 'Free Walk-in', icon: DoorOpen, variant: 'default' };
             return { label: 'Public & Free', icon: DoorOpen, variant: 'default' };
         }
         if (cost === 'paid') return { label: 'Public (Paid)', icon: DollarSign, variant: 'default' };

         return { label: 'Public Access', icon: DoorOpen, variant: 'default' };
    }

    // 4. Incomplete data fallbacks based on logistics or cost
    if (logistics === 'walk-in') {
        if (cost === 'free') return { label: 'Free Walk-in', icon: DoorOpen, variant: 'default' };
        if (cost === 'paid') return { label: 'Paid Walk-in', icon: DollarSign, variant: 'default' };
        return { label: 'Walk-in', icon: DoorOpen, variant: 'default' };
    }

    if (logistics === 'booking_required') return { label: 'Booking Required', icon: ShieldAlert, variant: 'outline' };
    if (logistics === 'tour_only') return { label: 'Tour Only', icon: Users, variant: 'outline' };

    if (cost === 'free') return { label: 'Free Access', icon: Wallet, variant: 'default' };
    if (cost === 'paid') return { label: 'Paid Access', icon: DollarSign, variant: 'outline' };
    if (cost === 'customers_only') return { label: 'Customers Only', icon: Store, variant: 'outline' };

    // 5. Default
    return { label: 'Access Unknown', icon: Search, variant: 'secondary' };
}
