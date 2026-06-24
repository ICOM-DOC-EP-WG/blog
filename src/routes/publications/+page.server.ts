// +page.server.ts
import type { PageServerLoad } from './$types';
import { loadZoteroPublications } from '$lib/utilities/loadZoteroPublications';

export const load: PageServerLoad = async ({ fetch }) => {
  const zoteroPublications = await loadZoteroPublications(fetch);

  return {
    metadata: {
      title: 'Bibliography',
      description: 'List of Zotero bibliography items'
    },
    zoteroPublications
  };
};