<script lang="ts">
	import { resolve } from '$app/paths';
	import { authorProfiles } from '$lib/config';
	import TagList from '$lib/components/TagList.svelte';
	import { normalizeBlogAuthors } from '$lib/utilities/authors';
	import { formatReadingTime } from '$lib/utilities/readingTime';

	type Props = {
		slug: string;
		title: string;
		date: string;
		authors?: BlogAuthorInput | BlogAuthorInput[];
		readingTime?: number;
		tags?: string[];
	};

	const { slug, title, date, authors, readingTime, tags }: Props = $props();

	const normalizedAuthors = $derived(normalizeBlogAuthors(authors, authorProfiles));
	const authorLabel = 'By';
	const url = $derived(resolve('/blog/[slug]', { slug }));
	const displayDate = $derived(
		new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(
			new Date(`${date}T00:00:00`)
		)
	);
</script>

<article class="postCard">
	<div class="postDetails">
		<time datetime={date}>{displayDate}</time>
		{#if typeof readingTime === 'number' && readingTime > 0}
			<span>{formatReadingTime(readingTime)}</span>
		{/if}
	</div>
	<header class="postHeader">
		<h2>{title}</h2>
	</header>
	{#if normalizedAuthors.length > 0}
		<p class="authorLine">
			<span>{authorLabel} :</span>
			{#each normalizedAuthors as author, authorIndex (author.slug || author.id || `${author.name}-${authorIndex}`)}
				{authorIndex > 0 ? ', ' : ''}
				{#if author.href}
					<a rel="author" href={author.href}>{author.name}</a>
				{:else}
					{author.name}
				{/if}
			{/each}
		</p>
	{/if}
	{#if (tags?.length ?? 0) > 0}
		<TagList tags={tags ?? []} label="Post tags" />
	{/if}
	<p class="readLink">
		<a
			class="stretchedLink"
			rel="bookmark"
			href={url}
			aria-label={`Read more: ${title}`}
		>
			Read more&nbsp;→
		</a>
	</p>
</article>

<style>
	.postCard {
		position: relative;
		padding: 1.5rem 0 1.6rem 1rem;
		border-bottom: 1px solid var(--color-shadow);
		border-left: 3px solid transparent;
		transition: border-color 150ms ease, background-color 150ms ease;
	}

	.postCard:hover,
	.postCard:focus-within {
		border-left-color: var(--color-secondary);
		background: linear-gradient(90deg, var(--color-secondary-accent), transparent 70%);
	}

	.postDetails {
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem;
		align-items: center;
		margin-bottom: 0.55rem;
		color: var(--color-text-secondary);
		font-size: 0.82rem;
	}

	.postDetails span {
		padding-left: 0.65rem;
		border-left: 1px solid var(--color-shadow);
	}

	.postHeader h2 {
		margin: 0;
		font-size: clamp(1.2rem, 2.5vw, 1.65rem);
		line-height: 1.3;
	}

	.authorLine {
		margin: 0.55rem 0 0;
		color: var(--color-text-secondary);
		font-size: 0.9rem;
	}

	.authorLine span {
		color: var(--color-text);
		font-weight: 600;
	}

	.readLink {
		margin: 0.75rem 0 0;
		font-size: 0.9rem;
	}

	.stretchedLink {
		font-weight: 700;
		text-decoration-thickness: 1px;
		text-underline-offset: 0.2em;
	}

	.stretchedLink::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 1;
	}

	.postCard a:not(.stretchedLink) {
		position: relative;
		z-index: 2;
	}

	.postCard:focus-within {
		outline: 2px solid var(--color-link);
		outline-offset: 3px;
	}

	@media (prefers-reduced-motion: reduce) {
		.postCard {
			transition: none;
		}
	}
</style>
