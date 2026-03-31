import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
export function TagInput({ placeholder, tags, setTags, className }) {
    const [inputValue, setInputValue] = useState('');
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag();
        }
    };
    const addTag = () => {
        const trimmedInput = inputValue.trim();
        if (trimmedInput && !tags.includes(trimmedInput)) {
            setTags([...tags, trimmedInput]);
            setInputValue('');
        }
    };
    const removeTag = (tagToRemove) => {
        setTags(tags.filter((tag) => tag !== tagToRemove));
    };
    return (_jsxs("div", { className: `space-y-2 ${className}`, children: [_jsx("div", { className: "flex flex-wrap gap-2 mb-2", children: tags.map((tag, index) => (_jsxs(Badge, { variant: "default", className: "flex items-center gap-1", children: [tag, _jsxs("button", { type: "button", onClick: () => removeTag(tag), className: "hover:bg-surface-muted rounded-sm p-0.5", children: [_jsx(X, { className: "h-3 w-3" }), _jsxs("span", { className: "sr-only", children: ["Remove ", tag] })] })] }, index))) }), _jsx("div", { className: "flex gap-2", children: _jsx(Input, { type: "text", placeholder: placeholder, value: inputValue, onChange: (e) => setInputValue(e.target.value), onKeyDown: handleKeyDown, onBlur: addTag }) })] }));
}
