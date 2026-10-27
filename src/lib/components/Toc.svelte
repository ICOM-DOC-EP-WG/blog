<script lang="ts">
	type Props = { headings?: Heading[]; label?: string; maxDepth?: 2 | 3 };

	let { headings = [], label = 'Table des matières', maxDepth = 2 }: Props = $props();

	const visible = $derived(headings.filter((h) => h.depth <= maxDepth));
</script>

{#if visible.length > 0}
	<details class="toc">
		<summary>Summary</summary>
		<nav aria-label={label}>
			<ul>
				{#each visible as h (h.id)}
					<li class:sub={h.depth === 3}>
						<a href="#{h.id}">{h.text}</a>
					</li>
				{/each}
			</ul>
		</nav>
	</details>
{/if}

<style>
	.toc {
		margin: 0 0 1.5rem;
		border-block: 1px solid var(--color-shadow);
		color: var(--color-text-secondary);
		font-size: 0.88rem;
	}

	.toc summary {
		display: flex;
		min-height: 2.8rem;
		align-items: center;
		gap: 0.55rem;
		color: var(--color-link);
		cursor: pointer;
		font-weight: 700;
		list-style: none;
	}

	.toc summary::-webkit-details-marker {
		display: none;
	}

	.toc summary::after {
		width: 0.4rem;
		height: 0.4rem;
		margin-left: auto;
		border-right: 1.5px solid currentColor;
		border-bottom: 1.5px solid currentColor;
		content: '';
		transform: rotate(45deg) translateY(-0.1rem);
	}

	.toc ul {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr));
		gap: 0.35rem 1.5rem;
		margin: 0;
		padding: 0 0 1rem;
		list-style: none;
	}

	.toc li.sub {
		padding-left: 0.85rem;
	}

	.toc a {
		color: var(--color-text-secondary);
		text-decoration: none;
	}

	.toc a:hover,
	.toc a:focus-visible {
		color: var(--color-link);
		text-decoration: underline;
		text-underline-offset: 0.15em;
	}
</style>
