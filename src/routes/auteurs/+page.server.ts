import type { PageServerLoad } from './$types';
import { getAllAuthors } from '$lib/utilities/authors';

export const load: PageServerLoad = async () => {
  const authors = getAllAuthors();
  return {
    authors: authors.map((author) => ({
      id: author.slug,
      slug: author.slug,
      name: author.name || author.slug,
      href: author.href || `/auteurs/${author.slug}`,
    })),
    metadata: {
      title: 'Auteurs',
      description: 'Liste des auteurs du site.',
    },
  };
};