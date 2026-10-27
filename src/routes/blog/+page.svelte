<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';
	import * as config from '$lib/config';
	import ArticleCard from '$lib/components/ArticleCard.svelte';

	let { data }: PageProps = $props();
	const url = (tag: string) => resolve('/tags/[tag]', { tag });
</script>

<svelte:head>
	<title>Blog | {config.siteTitle}</title>
	<meta name="description" content={config.siteDescription} />
</svelte:head>


<div class="pageIntro">
	<p class="eyebrow">Exhibition &amp; Performance Documentation</p>
	<h1>Blog</h1>
	<p class="introText">Notes, resources, and news from the working group.</p>
	<p class="postCount">{data.posts.length} {data.posts.length === 1 ? 'recent post' : 'recent posts'}</p>
</div>

<section class="postList" aria-label="Blog posts">
	{#each data.posts as post (post.slug)}
		<ArticleCard
			slug={post.slug}
			title={post.title}
			date={post.date}
			authors={post.author}
			readingTime={post.readingTime}
			tags={post.tags}
		/>
	{/each}
</section>

{#if data.tags.length > 0}
	<section class="tagSection" aria-label="Blog tags">
		<div class="tagHeading">
			<p class="eyebrow">Explore topics</p>
			<h2>All tags</h2>
		</div>
		<ul class="tagCloud">
			{#each data.tags as tag, index (tag.slug)}
				<li>
					<a href={url(tag.slug)}><span>#{tag.tag}</span><span class="tagCount">{tag.count}</span></a>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	.pageIntro {
		padding: clamp(1.5rem, 5vw, 3.5rem) 0 1.75rem;
		border-bottom: 1px solid var(--color-shadow);
	}

	.eyebrow {
		margin: 0 0 0.65rem;
		color: var(--color-secondary);
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
	}

	h1 {
		margin: 0;
		font-size: clamp(2.2rem, 6vw, 4rem);
		line-height: 1.05;
	}

	.introText {
		max-width: 38rem;
		margin: 0.8rem 0 0;
		color: var(--color-text-secondary);
		font-size: 1.1rem;
	}

	.postCount {
		margin: 1.2rem 0 0;
		color: var(--color-link);
		font-size: 0.85rem;
		font-weight: 700;
	}

	.postList {
		padding-top: 0.5rem;
	}

	.tagSection {
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--color-shadow);
	}

	.tagHeading h2 {
		margin: 0;
		font-size: 1.35rem;
	}

	.tagCloud {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
		margin: 1rem 0 0;
		padding: 0;
		list-style: none;
	}

	.tagCloud a {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.45rem 0.7rem;
		border: 1px solid var(--color-shadow);
		border-radius: 4px;
		color: var(--color-link);
		font-size: 0.88rem;
		text-decoration: none;
		transition: border-color 150ms ease, background-color 150ms ease;
	}

	.tagCloud a:hover,
	.tagCloud a:focus-visible {
		border-color: var(--color-secondary);
		background: var(--color-secondary-accent);
	}

	.tagCount {
		color: var(--color-text-secondary);
		font-size: 0.78rem;
	}
</style>
