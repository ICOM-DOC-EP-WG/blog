<script lang="ts">
	import type { PageProps } from './$types';
	import * as config from '$lib/config';
	import { memberAuthorDirectory } from '$lib/members';

	import PostNavigation from '$lib/components/PostNavigation.svelte';
	import Toc from '$lib/components/Toc.svelte';
	import TagList from '$lib/components/TagList.svelte';
	import { normalizeBlogAuthors } from '$lib/utilities/authors';
	import { formatReadingTime } from '$lib/utilities/readingTime';

	let { data }: PageProps = $props();

	const post = $derived(data.post);
	const previousPost = $derived(data.previousPost);
	const nextPost = $derived(data.nextPost);
	const metadata = $derived(post.metadata);
	const Content = $derived(post.component);
	const authors = $derived(normalizeBlogAuthors(metadata.author, memberAuthorDirectory));
	const displayDate = $derived(
		new Intl.DateTimeFormat('en-GB', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			timeZone: 'UTC'
		}).format(new Date(`${metadata.date}T00:00:00Z`))
	);
</script>

<svelte:head>
	<title>{metadata.title ? `${metadata.title} | ${config.siteTitle}` : config.siteTitle}</title>
	<meta name="description" content={metadata.description || config.siteDescription} />
	<meta property="og:type" content="article" />
	<meta property="article:published_time" content={metadata.date} />
</svelte:head>


<div class="article-page">
	<div class="article-meta">
		<time datetime={metadata.date}>{displayDate}</time>
		{#if typeof metadata.readingTime === 'number' && metadata.readingTime > 0}
			<span>{formatReadingTime(metadata.readingTime)}</span>
		{/if}
		{#if authors.length > 0}
			<span class="byline">
				<span>By</span>
				{#each authors as author, index (author.slug || author.id || `${author.name}-${index}`)}
					{#if index > 0}, {/if}
					{#if author.href}
						<a rel="author" href={author.href}>{author.name}</a>
					{:else}
						{author.name}
					{/if}
				{/each}
			</span>
		{/if}
	</div>

	<Toc headings={metadata.headings} label="Table of contents" maxDepth={3} />

	<div class="article-content">
		<Content />
	</div>

	{#if (metadata.tags?.length ?? 0) > 0}
		<div class="article-tags">
			<p>Topics</p>
			<TagList tags={metadata.tags} label="Article topics" />
		</div>
	{/if}

	<PostNavigation {previousPost} {nextPost} />
	</div>

<style>
	.article-page {
		max-width: 74ch;
		margin-inline: auto;
	}

	.article-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 0.8rem;
		align-items: center;
		margin: 1.5rem 0 1rem;
		color: var(--color-text-secondary);
		font-size: 0.82rem;
	}

	.article-meta > span:not(.byline)::before,
	.byline::before {
		padding-right: 0.8rem;
		color: var(--color-shadow);
		content: '·';
	}

	.byline > span {
		margin-right: 0.25rem;
	}

	.byline a {
		color: var(--color-text-secondary);
		text-decoration-color: transparent;
		text-underline-offset: 0.15em;
	}

	.byline a:hover,
	.byline a:focus-visible {
		color: var(--color-link);
		text-decoration-color: currentColor;
	}

	.article-content {
		font-size: 1.04rem;
		line-height: 1.75;
	}

	:global(.article-content > h1:first-child) {
		margin: 0 0 1.15rem;
		font-size: clamp(2rem, 5vw, 3.25rem);
		line-height: 1.12;
	}

	:global(.article-content h2) {
		margin-top: 2.5rem;
		font-size: 1.75rem;
		line-height: 1.25;
	}

	:global(.article-content h3) {
		margin-top: 2rem;
		font-size: 1.3rem;
		line-height: 1.35;
	}

	:global(.article-content p),
	:global(.article-content ul),
	:global(.article-content ol),
	:global(.article-content blockquote),
	:global(.article-content table) {
		margin-block: 1rem;
	}

	:global(.article-content img) {
		display: block;
		height: auto;
		margin: 1.5rem auto;
	}

	:global(.article-content pre) {
		max-width: 100%;
		overflow-x: auto;
	}

	.article-tags {
		margin-top: 2rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-shadow);
	}

	.article-tags > p {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
	}

	@media (max-width: 600px) {
		.article-page {
			max-width: 100%;
		}

		.article-meta {
			margin-top: 1rem;
		}

		.article-content {
			font-size: 1rem;
			line-height: 1.7;
		}
	}
</style>
