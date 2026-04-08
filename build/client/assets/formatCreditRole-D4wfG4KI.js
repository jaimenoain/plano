function r(t,i){return t==="other"&&(i!=null&&i.trim())?i.trim():t.split("_").map(a=>a.charAt(0).toUpperCase()+a.slice(1)).join(" ")}export{r as f};
