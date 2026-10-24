// Selection is limited to registered local packages. Old links keep their original region.
export function selectRegion(catalog,requested){
 const entries=catalog?.packages||[];
 const valid=entries.filter(e=>typeof e.path==='string'&&/^[a-z0-9-]+\.json$/.test(e.path));
 if(!valid.length)throw Error('No playable regions registered');
 return valid.find(e=>e.id===requested||e.path.slice(0,-5)===requested)||valid.find(e=>e.path==='white-bone.json')||valid[0];
}
export async function selectedRegionURL(search,fetcher=fetch){
 const response=await fetcher('./packages/catalog.json?v=142');if(!response.ok)throw Error('Region shelf unavailable');
 const entry=selectRegion(await response.json(),new URLSearchParams(search).get('region'));
 return './packages/'+entry.path+'?v=142';
}
