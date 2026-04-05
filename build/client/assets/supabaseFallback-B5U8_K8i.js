import{s as a}from"./client-rR1rgQyR.js";const q=async t=>{let e=a.from("buildings").select(`
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
  `);if(t.query_text&&t.query_text.trim().length>0){const o=t.query_text.trim();e=e.or(`name.ilike.%${o}%,alt_name.ilike.%${o}%,address.ilike.%${o}%`)}t.filters&&(t.filters.cities&&t.filters.cities.length>0&&(e=e.in("city",t.filters.cities)),t.filters.category_id&&(e=e.eq("functional_category_id",t.filters.category_id))),t.p_access_levels&&t.p_access_levels.length>0&&(e=e.in("access_level",t.p_access_levels)),t.p_access_logistics&&t.p_access_logistics.length>0&&(e=e.in("access_logistics",t.p_access_logistics)),t.p_access_costs&&t.p_access_costs.length>0&&(e=e.in("access_cost",t.p_access_costs)),e=e.limit(t.p_limit||50);const{data:c,error:r}=await e;if(r)throw r;return(c||[]).map(o=>{const n=o;return{...n,architects:(n.architects||[]).map(i=>i.architect),styles:(n.styles||[]).map(i=>i.style),typologies:(n.typologies||[]).map(i=>{var u;return(u=i.typology)==null?void 0:u.name}).filter(Boolean)}})},B=async t=>{if(!t.length)return[];const{data:e,error:c}=await a.from("buildings").select(`
      *,
      main_image_url,
      architects:building_architects(architect:architects(name, id)),
      functional_category_id,
      typologies:building_functional_typologies(typology_id),
      attributes:building_attributes(attribute_id)
    `).in("id",t);if(c)throw c;return e||[]},v=async(t,e)=>{let r=a.from("buildings").select(`
      *,
      alt_name,
      aliases,
      styles:building_styles(style:architectural_styles(id, name)),
      architects:building_architects(architect:architects(id, name)),
      category:functional_categories(name),
      typologies:building_functional_typologies(typology:functional_typologies(name, id)),
      attributes:building_attributes(attribute:attributes(name, id, group_id, group:attribute_groups(slug)))
    `);const o=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t),n=/^\d+$/.test(t);o?r=r.eq("id",t):n?r=r.eq("short_id",parseInt(t)):r=r.eq("slug",t);const{data:i,error:u}=await r.limit(1).maybeSingle();if(u)throw u;if(!i)throw new Error("Building not found");const d=Array.isArray(i.styles)?i.styles.map(s=>s.style):[],f=Array.isArray(i.architects)?i.architects.map(s=>s.architect):[],h=i.category&&typeof i.category=="object"&&i.category!==null&&"name"in i.category?String(i.category.name):null,p=Array.isArray(i.typologies)?i.typologies.map(s=>{var l;return(l=s.typology)==null?void 0:l.name}).filter(Boolean):[],y=Array.isArray(i.attributes)?i.attributes.map(s=>s.attribute).filter(Boolean):[],_=y.filter(s=>{var l,g;return((l=s.group)==null?void 0:l.slug)==="materiality"||((g=s.group)==null?void 0:g.slug)==="materials"}).map(s=>s.name),m=y.filter(s=>{var l;return((l=s.group)==null?void 0:l.slug)==="context"}).map(s=>s.name).join(", ")||null,b=y.filter(s=>{var l,g;return((l=s.group)==null?void 0:l.slug)==="intervention"||((g=s.group)==null?void 0:g.slug)==="interventions"}).map(s=>s.name).join(", ")||null;return{...i,styles:d,architects:f,category:h,typology:p,materials:_.length>0?_:null,context:m,intervention:b}},A=async(t,e)=>{const{data:c,error:r}=await a.from("user_buildings").select("*").eq("user_id",t).eq("building_id",e).maybeSingle();if(r)throw r;return c},x=async t=>{const{data:e,error:c}=await a.from("user_buildings").upsert(t,{onConflict:"user_id, building_id"}).select().single();if(c)throw c;return e},S=async t=>{const{error:e}=await a.from("user_buildings").delete().eq("id",t);if(e)throw e;return!0};export{A as a,S as d,v as f,B as g,q as s,x as u};
