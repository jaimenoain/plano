import{s as a}from"./client-rR1rgQyR.js";import{c as b}from"./buildingPathId-BFMCb5KO.js";const B=async t=>{let e=a.from("buildings").select(`
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
  `);if(t.query_text&&t.query_text.trim().length>0){const r=t.query_text.trim();e=e.or(`name.ilike.%${r}%,alt_name.ilike.%${r}%,address.ilike.%${r}%`)}t.filters&&(t.filters.cities&&t.filters.cities.length>0&&(e=e.in("city",t.filters.cities)),t.filters.category_id&&(e=e.eq("functional_category_id",t.filters.category_id))),t.p_access_levels&&t.p_access_levels.length>0&&(e=e.in("access_level",t.p_access_levels)),t.p_access_logistics&&t.p_access_logistics.length>0&&(e=e.in("access_logistics",t.p_access_logistics)),t.p_access_costs&&t.p_access_costs.length>0&&(e=e.in("access_cost",t.p_access_costs)),e=e.limit(t.p_limit||50);const{data:o,error:l}=await e;if(l)throw l;return(o||[]).map(r=>{const s=r;return{...s,architects:(s.architects||[]).map(n=>n.architect),styles:(s.styles||[]).map(n=>n.style),typologies:(s.typologies||[]).map(n=>{var g;return(g=n.typology)==null?void 0:g.name}).filter(Boolean)}})},v=async t=>{if(!t.length)return[];const{data:e,error:o}=await a.from("buildings").select(`
      *,
      main_image_url,
      architects:building_architects(architect:architects(name, id)),
      functional_category_id,
      typologies:building_functional_typologies(typology_id),
      attributes:building_attributes(attribute_id)
    `).in("id",t);if(o)throw o;return e||[]},A=async(t,e)=>{let l=a.from("buildings").select(`
      *,
      alt_name,
      aliases,
      styles:building_styles(style:architectural_styles(id, name)),
      architects:building_architects(architect:architects(id, name)),
      category:functional_categories(name),
      typologies:building_functional_typologies(typology:functional_typologies(name, id)),
      attributes:building_attributes(attribute:attributes(name, id, group_id, group:attribute_groups(slug)))
    `);const r=b(t);r.kind==="uuid"?l=l.eq("id",r.value):r.kind==="shortId"?l=l.eq("short_id",r.value):l=l.eq("slug",r.value);const{data:s,error:n}=await l.limit(1).maybeSingle();if(n)throw n;if(!s)throw new Error("Building not found");const g=Array.isArray(s.styles)?s.styles.map(i=>i.style):[],d=Array.isArray(s.architects)?s.architects.map(i=>i.architect):[],f=s.category&&typeof s.category=="object"&&s.category!==null&&"name"in s.category?String(s.category.name):null,h=Array.isArray(s.typologies)?s.typologies.map(i=>{var c;return(c=i.typology)==null?void 0:c.name}).filter(Boolean):[],y=Array.isArray(s.attributes)?s.attributes.map(i=>i.attribute).filter(Boolean):[],_=y.filter(i=>{var c,u;return((c=i.group)==null?void 0:c.slug)==="materiality"||((u=i.group)==null?void 0:u.slug)==="materials"}).map(i=>i.name),m=y.filter(i=>{var c;return((c=i.group)==null?void 0:c.slug)==="context"}).map(i=>i.name).join(", ")||null,p=y.filter(i=>{var c,u;return((c=i.group)==null?void 0:c.slug)==="intervention"||((u=i.group)==null?void 0:u.slug)==="interventions"}).map(i=>i.name).join(", ")||null;return{...s,styles:g,architects:d,category:f,typology:h,materials:_.length>0?_:null,context:m,intervention:p}},x=async(t,e)=>{const{data:o,error:l}=await a.from("user_buildings").select("*").eq("user_id",t).eq("building_id",e).maybeSingle();if(l)throw l;return o},k=async t=>{const{data:e,error:o}=await a.from("user_buildings").upsert(t,{onConflict:"user_id, building_id"}).select().single();if(o)throw o;return e},S=async t=>{const{error:e}=await a.from("user_buildings").delete().eq("id",t);if(e)throw e;return!0};export{x as a,S as d,A as f,v as g,B as s,k as u};
