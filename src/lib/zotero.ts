export async function fetchZoteroCollectionItems(
  groupId: number,
  collectionId: string,
  limit: number = 100
) {
  const baseUrl = `https://api.zotero.org/groups/${groupId}/collections/${collectionId}/items`;
  const items: any[] = [];
  let start = 0;
  const step = limit > 100 ? 100 : limit; // Zotero max limit per request is 100

  while (true) {
    const url = `${baseUrl}?format=json&limit=${step}&start=${start}`;
    const response = await fetch(url, {
      headers: {
        // Recommended: Add a User-Agent or Zotero API key if you have one to avoid rate limiting
        // 'Zotero-API-Key': 'YOUR_API_KEY', 
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Zotero collection (Status ${response.status}): ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.length === 0) {
      break; // No more items
    }

    items.push(...data);
    start += step;

    // Safety break if total count is unknown and we hit a large number, 
    // though Zotero usually returns empty array when done.
    if (data.length < step) {
      break; 
    }
  }

  return items;
}