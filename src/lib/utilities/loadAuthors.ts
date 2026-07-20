import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

const AUTHORS_DIR = join(process.cwd(), 'src/authors');

export type MarkdownAuthor = {
  slug: string;
  name?: string;
  orcidId?: string;
  zoteroUsername?: string;
  zoteroUserId?: number;
  zoteroGroupId?: number;
  zoteroCollectionId?: string;
  forgeService?: string;
  forgeUsername?: string;
  bio?: string;
  affiliations?: Array<{
    title?: string;
    organization?: string;
    startDate?: string;
    endDate?: string;
  }>;
  content?: string;
  href?: string;
};

export type AuthorDirectory = Record<string, MarkdownAuthor>;

export function loadAuthorsFromMarkdown(): MarkdownAuthor[] {
  try {
    const files = readdirSync(AUTHORS_DIR).filter((file) => file.endsWith('.md'));
    const authors: MarkdownAuthor[] = [];
    for (const file of files) {
      const filePath = join(AUTHORS_DIR, file);
      const fileContent = readFileSync(filePath, 'utf-8');
      const { data, content } = matter(fileContent);
      const author: MarkdownAuthor = {
        slug: data.slug || file.replace('.md', ''),
        name: data.name,
        orcidId: data.orcidId,
        zoteroUsername: data.zoteroUsername,
        zoteroUserId: data.zoteroUserId,
        zoteroGroupId: data.zoteroGroupId,
        zoteroCollectionId: data.zoteroCollectionId,
        forgeService: data.forgeService,
        forgeUsername: data.forgeUsername,
        bio: data.bio,
        affiliations: data.affiliations,
        content: marked(content),
        href: data.href,
      };
      authors.push(author);
    }
    return authors;
  } catch (error) {
    console.error('Erreur lors du chargement des auteurs depuis Markdown:', error);
    return [];
  }
}

export function loadAuthorFromMarkdown(slug: string): MarkdownAuthor | null {
  const authors = loadAuthorsFromMarkdown();
  return authors.find((author) => author.slug === slug) || null;
}

export function getAuthorDirectoryFromMarkdown(): AuthorDirectory {
  const authors = loadAuthorsFromMarkdown();
  const directory: AuthorDirectory = {};
  for (const author of authors) {
    directory[author.slug] = author;
  }
  return directory;
}