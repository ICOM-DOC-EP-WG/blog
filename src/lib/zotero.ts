export async function fetchZoteroCollectionItems(
  groupId: number,
  collectionId: string,
  limit: number = 100
) {
  const url = `https://api.zotero.org/groups/${groupId}/collections/${collectionId}/items?format=json&limit=${limit}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch Zotero collection: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}