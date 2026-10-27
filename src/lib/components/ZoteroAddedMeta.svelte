<script lang="ts">
	type Props = {
		publication: Pick<ZoteroPublication, 'addedBy' | 'dateAdded'>;
	};

	let { publication }: Props = $props();

	const addedDate = $derived.by(() => {
		if (!publication.dateAdded) return undefined;
		const date = new Date(publication.dateAdded);
		return Number.isNaN(date.getTime())
			? undefined
			: new Intl.DateTimeFormat('en-GB', {
					day: 'numeric',
					month: 'short',
					year: 'numeric',
					timeZone: 'UTC'
				}).format(date);
	});
</script>

{#if publication.addedBy || addedDate}
	<p class="added-meta">
		{#if publication.addedBy && addedDate}
			Added to the bibliography by {publication.addedBy} on
			<time datetime={publication.dateAdded}>{addedDate}</time>.
		{:else if publication.addedBy}
			Added to the bibliography by {publication.addedBy}.
		{:else if addedDate}
			Added to the bibliography on <time datetime={publication.dateAdded}>{addedDate}</time>.
		{/if}
	</p>
{/if}

<style>
	.added-meta {
		margin: 0.45rem 0 0;
		color: var(--color-text-secondary, #777);
		font-size: 0.75rem;
	}
</style>