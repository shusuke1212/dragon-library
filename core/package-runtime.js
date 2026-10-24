export async function loadRegionPackage(url){
  const response=await fetch(url);
  if(!response.ok)throw new Error(`Package load failed: ${response.status}`);
  const pkg=await response.json();
  const errors=validateRegionPackage(pkg);
  if(errors.length)throw new Error(`Invalid region package: ${errors.join(', ')}`);
  return pkg;
}

export function validateRegionPackage(pkg){
  const errors=[];
  if(!pkg?.id)errors.push('id');
  if(!pkg?.schemaVersion)errors.push('schemaVersion');
  if(!pkg?.fieldLayout?.storyAreas?.length)errors.push('fieldLayout.storyAreas');
  if(!pkg?.regionRecipe)errors.push('regionRecipe');
  if(!pkg?.storyModel?.hintLinks)errors.push('storyModel.hintLinks');
  return errors;
}

export function clonePackageSection(value){return structuredClone(value)}

export function packageStorageKey(pkg,feature,version='v1'){
  return `${feature}:${pkg.id}:${version}`;
}
