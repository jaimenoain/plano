import{j as r}from"./jsx-runtime-B7IEPNj0.js";import{r as m}from"./chunk-UVKPFVEO-0GoGUtgA.js";import{c as f}from"./utils-DsTqsvJM.js";import{B as d}from"./badge-DSQ4ez5E.js";import{C as h}from"./calendar-CBKuckct.js";import{c as l}from"./createLucideIcon-DZLtHuI1.js";import{B as k}from"./building-2-BjdrQmK2.js";import{M as g}from"./map-DvgXbl9k.js";import{A as j}from"./activity-B7TfkBWk.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A=l("Hammer",[["path",{d:"m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9",key:"eefl8a"}],["path",{d:"m18 15 4-4",key:"16gjal"}],["path",{d:"m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5",key:"b7pghm"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b=l("Palette",[["circle",{cx:"13.5",cy:"6.5",r:".5",fill:"currentColor",key:"1okk4w"}],["circle",{cx:"17.5",cy:"10.5",r:".5",fill:"currentColor",key:"f64h9f"}],["circle",{cx:"8.5",cy:"7.5",r:".5",fill:"currentColor",key:"fotxhn"}],["circle",{cx:"6.5",cy:"12.5",r:".5",fill:"currentColor",key:"qy21gx"}],["path",{d:"M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z",key:"12rzf8"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v=l("Tag",[["path",{d:"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",key:"vktsd0"}],["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor",key:"kqv944"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C=l("Wrench",[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",key:"cbrjhi"}]]),T=({building:t,className:y})=>{var o;const u=e=>!!(e==null||Array.isArray(e)&&e.length===0||typeof e=="string"&&e.trim()===""),p=e=>Array.isArray(e)?e.length===0?"":typeof e[0]=="object"&&e[0]!==null&&"name"in e[0]?e.map(i=>i.name).join(", "):e.join(", "):String(e),n=[{key:"year_completed",label:"Year",icon:h,value:(o=t.year_completed)==null?void 0:o.toString()},{key:"category",label:"Category",icon:v,value:t.category},{key:"typology",label:"Typology",icon:k,value:t.typology},{key:"context",label:"Context",icon:g,value:t.context},{key:"intervention",label:"Intervention",icon:C,value:t.intervention},{key:"materials",label:"Materials",icon:A,value:t.materials},{key:"styles",label:"Styles",icon:b,value:t.styles},{key:"status",label:"Status",icon:j,value:t.status}].filter(e=>!u(e.value));return n.length===0?null:r.jsx("dl",{className:f("grid grid-cols-[120px_1fr] gap-y-3 gap-x-4 text-sm text-text-primary",y),children:n.map(e=>{const c=e.value;if(Array.isArray(c)&&c.length>0){const a=c,x=typeof a[0]=="object"&&a[0]!==null&&"name"in a[0]?a.map(s=>s.name):a;return r.jsxs("div",{className:"contents",children:[r.jsxs("dt",{className:"text-xs font-medium text-text-secondary uppercase tracking-wide flex items-center gap-1.5",children:[m.createElement(e.icon,{className:"w-3.5 h-3.5"}),e.label]}),r.jsx("dd",{className:"flex flex-wrap gap-2",children:x.map(s=>r.jsx(d,{variant:"outline",className:"text-xs",children:s},s))})]},e.key)}return r.jsxs("div",{className:"contents",children:[r.jsxs("dt",{className:"text-xs font-medium text-text-secondary uppercase tracking-wide flex items-center gap-1.5",children:[m.createElement(e.icon,{className:"w-3.5 h-3.5"}),e.label]}),r.jsx("dd",{children:p(e.value)})]},e.key)})})};export{T as B};
