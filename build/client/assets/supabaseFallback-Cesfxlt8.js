import{s as g}from"./client-rR1rgQyR.js";import{c as b}from"./buildingPathId-BFMCb5KO.js";const v=async t=>{let e=g.from("buildings").select(`
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
    building_credits(
      credit_tier,
      status,
      person:people(id, name),
      company:companies(id, name)
    ),
    styles:building_styles(style:architectural_styles(id, name)),
    typologies:building_functional_typologies(typology:functional_typologies(name, id))
  `);if(t.query_text&&t.query_text.trim().length>0){const o=t.query_text.trim();e=e.or(`name.ilike.%${o}%,alt_name.ilike.%${o}%,address.ilike.%${o}%`)}t.filters&&(t.filters.cities&&t.filters.cities.length>0&&(e=e.in("city",t.filters.cities)),t.filters.category_id&&(e=e.eq("functional_category_id",t.filters.category_id))),t.p_access_levels&&t.p_access_levels.length>0&&(e=e.in("access_level",t.p_access_levels)),t.p_access_logistics&&t.p_access_logistics.length>0&&(e=e.in("access_logistics",t.p_access_logistics)),t.p_access_costs&&t.p_access_costs.length>0&&(e=e.in("access_cost",t.p_access_costs)),e=e.limit(t.p_limit||50);const{data:u,error:l}=await e;if(l)throw l;return(u||[]).map(o=>{const s=o,f=(s.building_credits??[]).filter(i=>i.credit_tier==="primary"&&(i.status==="active"||i.status==="verified")).map(i=>{const n=i.person,d=i.company;return n&&d?{id:n.id,name:`${n.name} @ ${d.name}`}:n?{id:n.id,name:n.name}:d?{id:d.id,name:d.name}:null}).filter(i=>i!=null),{building_credits:p,...a}=s;return{...a,credits:f,styles:(s.styles||[]).map(i=>i.style),typologies:(s.typologies||[]).map(i=>{var n;return(n=i.typology)==null?void 0:n.name}).filter(Boolean)}})},q=async t=>{if(!t.length)return[];const{data:e,error:u}=await g.from("buildings").select(`
      *,
      main_image_url,
      building_credits(
        credit_tier,
        status,
        person:people(id, name),
        company:companies(id, name)
      ),
      functional_category_id,
      typologies:building_functional_typologies(typology_id),
      attributes:building_attributes(attribute_id)
    `).in("id",t);if(u)throw u;return(e||[]).map(l=>{const o=l,m=(o.building_credits??[]).filter(a=>a.credit_tier==="primary"&&(a.status==="active"||a.status==="verified")).map(a=>{const i=a.person,n=a.company;return i&&n?{id:i.id,name:`${i.name} @ ${n.name}`}:i?{id:i.id,name:i.name}:n?{id:n.id,name:n.name}:null}).filter(a=>a!=null),{building_credits:f,...p}=o;return{...p,credits:m}})},B=async(t,e)=>{let l=g.from("buildings").select(`
      *,
      alt_name,
      aliases,
      styles:building_styles(style:architectural_styles(id, name)),
      category:functional_categories(name),
      typologies:building_functional_typologies(typology:functional_typologies(name, id)),
      attributes:building_attributes(attribute:attributes(name, id, group_id, group:attribute_groups(slug)))
    `);const o=b(t);o.kind==="uuid"?l=l.eq("id",o.value):o.kind==="shortId"?l=l.eq("short_id",o.value):l=l.eq("slug",o.value);const{data:s,error:_}=await l.limit(1).maybeSingle();if(_)throw _;if(!s)throw new Error("Building not found");const m=Array.isArray(s.styles)?s.styles.map(r=>r.style):[],f=s.category&&typeof s.category=="object"&&s.category!==null&&"name"in s.category?String(s.category.name):null,p=Array.isArray(s.typologies)?s.typologies.map(r=>{var c;return(c=r.typology)==null?void 0:c.name}).filter(Boolean):[],a=Array.isArray(s.attributes)?s.attributes.map(r=>r.attribute).filter(Boolean):[],i=a.filter(r=>{var c,y;return((c=r.group)==null?void 0:c.slug)==="materiality"||((y=r.group)==null?void 0:y.slug)==="materials"}).map(r=>r.name),n=a.filter(r=>{var c;return((c=r.group)==null?void 0:c.slug)==="context"}).map(r=>r.name).join(", ")||null,d=a.filter(r=>{var c,y;return((c=r.group)==null?void 0:c.slug)==="intervention"||((y=r.group)==null?void 0:y.slug)==="interventions"}).map(r=>r.name).join(", ")||null;return{...s,styles:m,credits:[],category:f,typology:p,materials:i.length>0?i:null,context:n,intervention:d}},$=async(t,e)=>{const{data:u,error:l}=await g.from("user_buildings").select("*").eq("user_id",t).eq("building_id",e).maybeSingle();if(l)throw l;return u},x=async t=>{const{data:e,error:u}=await g.from("user_buildings").upsert(t,{onConflict:"user_id, building_id"}).select().single();if(u)throw u;return e},A=async t=>{const{error:e}=await g.from("user_buildings").delete().eq("id",t);if(e)throw e;return!0};export{$ as a,A as d,B as f,q as g,v as s,x as u};
