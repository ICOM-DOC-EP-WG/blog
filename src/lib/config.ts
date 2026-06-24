/**
 * Shared site values.
 *
 * Update this file with your own values.
 **/

export const siteTitle = 'Exhibition and Performance Documentation Icom Working Group Website';
export const siteDescription = 'A website for the ICOM Working Group on Exhibition and Performance Documentation, built with SvelteKit and Markdown.';
export const siteURL = 'example.com';
export const siteLink = 'https://github.com/icom-doc-ep-wg/github.io/blog/';
export const siteAuthor = 'ICOM';
export const contactInfo = 'icomdoc.epwg@gmail.com';

// Optional author directory used to resolve profile links from IDs.
// Recommended: keep key and slug identical unless you need a separate internal ID.
export const authorProfiles: Record<
	string,
	{
		slug: string;
		name?: string;
		href?: string;
		orcidId?: string;
		zoteroUsername?: string;
		zoteroUserId?: number;
		zoteroGroupId?: number; 
		zoteroCollectionId?: string; 
		forgeService?: string;
		forgeUsername?: string;
	}
> = {
	icomwg: {
		slug: 'EPD_WG',
		name: 'Exhibition and Performance Documentation Working Group',
		href: '/auteurs/epd_wg',
		zoteroUsername: 'icomdoc.epwg',
		zoteroUserId: 19754837,
		zoteroGroupId: 6441975, // ID du groupe Zotero
		zoteroCollectionId: 'EJT4TG8U', // ID de la collection
	}
};

// Posts shown per page on the blog index
export const postsPerPage = 10;
// Projects shown per page
export const projectsPerPage = 10;

// Zotero citation settings (global)
export const zoteroCitationStyle = 'chicago-note-bibliography';
export const zoteroCitationLocale = 'fr-FR';
export const zoteroReferenceContent: 'bib' | 'citation' = 'bib';

// Main navigation menu (also used in footer and mobile nav)
// 'hidden' is optional: omitted or false means visible by default
export const navItems = [
	{
		title: 'Accueil',
		route: '/',
		hidden: true // Hide this item from menus
	},
	{
		title: 'Blog',
		route: '/blog'
		// hidden omitted = visible by default
	},
	{
		title: 'Projects',
		route: '/projects'
	},
	{
		title: 'Tags',
		route: '/tags'
		// hidden omitted = visible by default
	},
	{
		title: 'Bibliography',
		route: '/publications'
		// hidden omitted = visible by default
	},
	{
		title: 'About',
		route: '/a-propos'
		// hidden omitted = visible by default
	}
];
