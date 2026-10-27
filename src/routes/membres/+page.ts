import { resolve } from '$app/paths';
import type { PageLoad } from './$types';

import * as config from '$lib/config';
import { workingGroupMembers } from '$lib/members';
import { loadPublishedPosts } from '$lib/utilities/loadPublishedPosts';
import { loadProjects } from '$lib/utilities/loadProjects';
import { normalizeBlogAuthors } from '$lib/utilities/authors';

type MemberWork = {
	slug: string;
	title: string;
	href: string;
};

type Member = {
	id: string;
	name: string;
	affiliation?: string;
	city?: string;
	country?: string;
	authorId?: string;
	articles: MemberWork[];
	projects: MemberWork[];
};

export const load: PageLoad = async () => {
	const [posts, projects] = await Promise.all([loadPublishedPosts(), loadProjects()]);
	const members = new Map<string, Member>(
		workingGroupMembers.map((member) => [
			member.id,
			{ ...member, articles: [], projects: [] }
		])
	);

	const addWork = (authorInput: Posts['author'], work: MemberWork, kind: 'articles' | 'projects') => {
		for (const author of normalizeBlogAuthors(authorInput, config.authorProfiles)) {
			const id = author.id || author.slug || author.name;
			const rosterMember = workingGroupMembers.find((member) => member.authorId === id);
			const memberId = rosterMember?.id || id;
			const member = members.get(memberId) ?? {
				id: memberId,
				name: author.name,
				authorId: id,
				articles: [],
				projects: []
			};

			member[kind].push(work);
			members.set(memberId, member);
		}
	};

	for (const post of posts) {
		addWork(
			post.metadata.author,
			{
				slug: post.slug,
				title: post.metadata.title,
				href: resolve('/blog/[slug]', { slug: post.slug })
			},
			'articles'
		);
	}

	for (const project of projects) {
		addWork(
			project.metadata.author,
			{
				slug: project.slug,
				title: project.metadata.title,
				href: resolve('/projects/[slug]', { slug: project.slug })
			},
			'projects'
		);
	}

	return {
		members: Array.from(members.values()).sort((left, right) => {
			const rightContributions = right.articles.length + right.projects.length;
			const leftContributions = left.articles.length + left.projects.length;

			return rightContributions - leftContributions || left.name.localeCompare(right.name, 'en');
		}),
		metadata: {
			title: 'Members',
			description: 'Members, blog articles and projects of the working group.'
		}
	};
};