<script lang="ts">
	import { resolve } from '$app/paths';

	type NavigationPost = {
		slug: string;
		title: string;
	};

	type Props = {
		previousPost?: NavigationPost | null;
		nextPost?: NavigationPost | null;
		basePath?: '/blog/[slug]' | '/projects/[slug]';
	};

	let {
		previousPost = null,
		nextPost = null,
		basePath = '/blog/[slug]'
	}: Props = $props();

	const url = (slug: string) => resolve(basePath, { slug });
</script>

{#if previousPost || nextPost}
	<nav aria-label="Article navigation">
		{#if previousPost}
			<a
				href={url(previousPost.slug)}
				rel="prev"
				aria-label={`Previous article: ${previousPost.title}`}
			>
				<span class="direction">← Previous article</span>
				<span class="title">{previousPost.title}</span>
			</a>
		{/if}
		{#if nextPost}
			<a
				href={url(nextPost.slug)}
				rel="next"
				aria-label={`Next article: ${nextPost.title}`}
			>
				<span class="direction">Next article →</span>
				<span class="title">{nextPost.title}</span>
			</a>
		{/if}
	</nav>
{/if}

<style>
	nav {
		display: flex;
		gap: 0.75rem;
		margin-top: 3rem;
	}

	nav a {
		display: grid;
		flex: 1;
		align-content: start;
		gap: 0.35rem;
		min-width: 0;
		padding: 0.85rem 1rem;
		border-block: 1px solid var(--color-shadow);
		color: var(--color-link);
		text-decoration: none;
	}

	nav a:hover,
	nav a:focus-visible {
		background: var(--color-secondary-accent);
		text-decoration: underline;
		text-underline-offset: 0.15em;
	}

	.direction {
		color: var(--color-text-secondary);
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
	}

	.title {
		font-weight: 600;
		overflow-wrap: anywhere;
	}

	nav a[rel='next'] {
		text-align: right;
	}

	@media (max-width: 768px) {
		nav {
			flex-direction: column;
		}
	}
</style>
