import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { forwardRef, useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Save, MessageSquarePlus, Check, GripVertical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, } from "@/components/ui/select";
import { getBuildingImageUrl } from "@/utils/image";
export const CollectionBuildingCard = forwardRef(({ item, isHighlighted, setHighlightedId, canEdit, onUpdateNote, onNavigate, categorizationMethod, customCategories, onUpdateCategory, showImages = true, onRemove, isDraggable, dragHandleProps, badgeIndex }, ref) => {
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [noteValue, setNoteValue] = useState(item.note || "");
    const textareaRef = useRef(null);
    useEffect(() => {
        setNoteValue(item.note || "");
    }, [item.note]);
    // Auto-focus textarea when editing starts
    useEffect(() => {
        if (isEditingNote && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [isEditingNote]);
    const handleNoteBlur = (e) => {
        const value = e.target.value;
        onUpdateNote(value);
        setIsEditingNote(false);
    };
    const currentCategory = customCategories?.find(c => c.id === item.custom_category_id);
    const imageUrl = getBuildingImageUrl(item.building.hero_image_url || item.building.community_preview_url);
    const architectNames = item.building.building_architects
        ?.map((ba) => ba.architects?.name)
        .filter(Boolean)
        .join(", ");
    return (_jsxs(Card, { ref: ref, className: cn("group relative overflow-hidden transition-colors duration-150 cursor-pointer border border-border-default rounded-sm shadow-none bg-surface-card", isHighlighted
            ? "border-brand-primary ring-1 ring-brand-primary bg-brand-secondary/50"
            : "hover:border-border-strong"), onMouseEnter: () => setHighlightedId(item.building.id), onMouseLeave: () => setHighlightedId(null), onClick: () => {
            setHighlightedId(item.building.id);
            onNavigate();
});
CollectionBuildingCard.displayName = "CollectionBuildingCard";
