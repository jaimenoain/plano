import{s as a}from"./client-ZqQ_0Zzc.js";const b=async t=>{let e=a.from("buildings").select(`
    id,
    name,
    address,
    location,
    city,
    country,
    slug,
    short_id,
    main_image_url,
    year_completed,
    popularity_score,
    access_level,
    access_logistics,
    access_cost,
    status,
    architects:building_architects(architect:architects(id, name)),
    styles:building_styles(style:architectural_styles(id, name)),
    typologies:building_functional_typologies(typology:functional_typologies(name, id))
  `);if(t.query_text&&t.query_text.trim().length>0){const i=t.query_text.trim();e=e.or(`name.ilike.%${i}%,alt_name.ilike.%${i}%,address.ilike.%${i}%`)}t.filters&&(t.filters.cities&&t.filters.cities.length>0&&(e=e.in("city",t.filters.cities)),t.filters.category_id&&(e=e.eq("functional_category_id",t.filters.category_id))),t.p_access_levels&&t.p_access_levels.length>0&&(e=e.in("access_level",t.p_access_levels)),t.p_access_logistics&&t.p_access_logistics.length>0&&(e=e.in("access_logistics",t.p_access_logistics)),t.p_access_costs&&t.p_access_costs.length>0&&(e=e.in("access_cost",t.p_access_costs)),e=e.limit(t.p_limit||50);const{data:r,error:c}=await e;if(c)throw c;return(r||[]).map(i=>{const o=i;return{...o,architects:(o.architects||[]).map(n=>n.architect),styles:(o.styles||[]).map(n=>n.style),typologies:(o.typologies||[]).map(n=>{var g;return(g=n.typology)==null?void 0:g.name}).filter(Boolean)}})},w=async t=>{if(!t.length)return[];const{data:e,error:r}=await a.from("buildings").select(`
      *,
      main_image_url,
      architects:building_architects(architect:architects(name, id)),
      functional_category_id,
      typologies:building_functional_typologies(typology_id),
      attributes:building_attributes(attribute_id)
    `).in("id",t);if(r)throw r;return e||[]},q=async t=>{let e=a.from("buildings").select(`
      *,
      alt_name,
      aliases,
      styles:building_styles(style:architectural_styles(id, name)),
      architects:building_architects(architect:architects(id, name)),
      category:functional_categories(name),
      typologies:building_functional_typologies(typology:functional_typologies(name, id)),
      attributes:building_attributes(attribute:attributes(name, id, group_id, group:attribute_groups(slug)))
    `);const r=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t),c=/^\d+$/.test(t);r?e=e.eq("id",t):c?e=e.eq("short_id",parseInt(t)):e=e.eq("slug",t);const{data:i,error:o}=await e.limit(1).maybeSingle();if(o)throw o;if(!i)throw new Error("Building not found");const n=Array.isArray(i.styles)?i.styles.map(s=>s.style):[],g=Array.isArray(i.architects)?i.architects.map(s=>s.architect):[],d=i.category&&typeof i.category=="object"&&i.category!==null&&"name"in i.category?String(i.category.name):null,f=Array.isArray(i.typologies)?i.typologies.map(s=>{var l;return(l=s.typology)==null?void 0:l.name}).filter(Boolean):[],y=Array.isArray(i.attributes)?i.attributes.map(s=>s.attribute).filter(Boolean):[],_=y.filter(s=>{var l,u;return((l=s.group)==null?void 0:l.slug)==="materiality"||((u=s.group)==null?void 0:u.slug)==="materials"}).map(s=>s.name),h=y.filter(s=>{var l;return((l=s.group)==null?void 0:l.slug)==="context"}).map(s=>s.name).join(", ")||null,p=y.filter(s=>{var l,u;return((l=s.group)==null?void 0:l.slug)==="intervention"||((u=s.group)==null?void 0:u.slug)==="interventions"}).map(s=>s.name).join(", ")||null;return{...i,styles:n,architects:g,category:d,typology:f,materials:_.length>0?_:null,context:h,intervention:p}},B=async(t,e)=>{const{data:r,error:c}=await a.from("user_buildings").select("*").eq("user_id",t).eq("building_id",e).maybeSingle();if(c)throw c;return r},v=async t=>{const{data:e,error:r}=await a.from("user_buildings").upsert(t,{onConflict:"user_id, building_id"}).select().single();if(r)throw r;return e},A=async t=>{const{error:e}=await a.from("user_buildings").delete().eq("id",t);if(e)throw e;return!0};export{B as a,A as d,q as f,w as g,b as s,v as u};
