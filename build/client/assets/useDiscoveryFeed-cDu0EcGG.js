import{u as A}from"./DiscoverySearchInput-DsbfhaHo.js";import{s as n}from"./client-rR1rgQyR.js";import{u as R}from"./useAuth-BNLu8VOc.js";function K(q){const{user:s}=R(),u=10,{city:p,country:h,region:m,categoryId:b,typologyIds:l,attributeIds:d,architectIds:o}=q;return A({queryKey:["discovery_feed",s==null?void 0:s.id,p,h,m,b,l,d,o],queryFn:async({pageParam:c=0})=>{if(!s)return[];const{data:_,error:y}=await n.rpc("get_discovery_feed",{p_user_id:s.id,p_limit:u,p_offset:c,p_city_filter:p||null,p_country_filter:h||null,p_region_filter:m||null,p_category_id:b||null,p_typology_ids:l&&l.length>0?l:null,p_attribute_ids:d&&d.length>0?d:null,p_architect_ids:o&&o.length>0?o:null});if(y)throw y;const r=_;if(r.length>0){const g=r.map(i=>i.id),[E,P,...M]=await Promise.all([n.from("building_architects").select("building_id, architects(id, name)").in("building_id",g),n.from("follows").select("following_id").eq("follower_id",s.id),...g.map(i=>n.from("review_images").select(`
                  id,
                  storage_path,
                  likes_count,
                  created_at,
                  user_buildings!review_images_review_id_fkey!inner(
                    building_id,
                    user:profiles(
                      id,
                      username,
                      avatar_url,
                      first_name,
                      last_name
                    )
                  )
                `).eq("user_buildings.building_id",i).order("likes_count",{ascending:!1}).order("created_at",{ascending:!1}).limit(10))]),v=E.data,f=P.data,w=M.flatMap(i=>i.data||[]);if(v){const i={};v.forEach(e=>{e.architects&&(i[e.building_id]||(i[e.building_id]=[]),i[e.building_id].push(e.architects))}),r.forEach(e=>{e.architects=i[e.id]||[]})}if(w){const i={};w.forEach(e=>{var a;const t=(a=e.user_buildings)==null?void 0:a.building_id;t&&(i[t]||(i[t]=[]),i[t].length<10&&i[t].push(e))}),r.forEach(e=>{e.images=i[e.id]||[]})}const I=(f==null?void 0:f.map(i=>i.following_id))||[];if(I.length>0){const{data:i}=await n.from("user_buildings").select(`
                building_id,
                status,
                rating,
                user:profiles!inner(id, username, avatar_url, first_name, last_name)
            `).in("building_id",g).in("user_id",I).or("status.eq.visited,status.eq.pending,rating.gt.0");if(i){const e={};i.forEach(t=>{const a=Array.isArray(t.user)?t.user[0]:t.user,k={user:{id:a.id,username:a.username??null,avatar_url:a.avatar_url,first_name:a.first_name??null,last_name:a.last_name??null},status:t.status,rating:t.rating};e[t.building_id]||(e[t.building_id]=[]),e[t.building_id].push(k)}),r.forEach(t=>{t.contact_interactions=e[t.id]||[]})}}}return r},getNextPageParam:(c,_)=>{if(!(c.length<u))return _.length*u},enabled:!!s,initialPageParam:0})}export{K as u};
