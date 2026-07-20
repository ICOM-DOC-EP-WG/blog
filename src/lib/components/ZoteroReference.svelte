<script lang="ts">
	import { authorProfiles } from '$lib/config';
	import { normalizeZoteroAuthors } from '$lib/utilities/authors';

	type Props = { publication: ZoteroPublication };

	let { publication }: Props = $props();

	// Lien externe préféré : url du document, sinon DOI, sinon fiche Zotero
	const primaryLink = $derived(
		publication.url ||
			(publication.doi ? `https://doi.org/${publication.doi}` : undefined) ||
			publication.zoteroUrl
	);

	const linkHost = $derived.by(() => {
		if (!primaryLink) return undefined;
		try {
			return new URL(primaryLink).hostname.replace(/^www\./, '');
		} catch {
			return undefined;
		}
	});

	// Citation de repli si Zotero n'a pas fourni de formattedCitation
	const normalizedAuthors = $derived(normalizeZoteroAuthors(publication.creators, authorProfiles));
	const fallbackCitation = $derived(() => {
		const names = normalizedAuthors.map((a) => a.name).filter(Boolean);
		const authorsPart = names.length > 0 ? `${names.join(', ')}. ` : '';
		const yearPart = publication.parsedDate || publication.date;
		const datePart = yearPart ? `${yearPart}. ` : '';
		const titlePart = publication.title ? `« ${publication.title} ».` : '';
		return `${authorsPart}${datePart}${titlePart}`;
	});
</script>

<div class="zotero-reference">
	{#if publication.formattedCitation}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		<p class="citation">{@html publication.formattedCitation}</p>
	{:else}
		<p class="citation">{fallbackCitation()}</p>
	{/if}

	{#if primaryLink}
		<a class="view-link" href={primaryLink} target="_blank" rel="noopener noreferrer">
			<svg class="view-link-icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
				<path
					fill="currentColor"
					d="M14 3a1 1 0 1 0 0 2h3.586l-9.293 9.293a1 1 0 0 0 1.414 1.414L19 6.414V10a1 1 0 1 0 2 0V4a1 1 0 0 0-1-1h-6Z"
				/>
				<path
					fill="currentColor"
					d="M5 5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5a1 1 0 1 0-2 0v5H5V7h5a1 1 0 1 0 0-2H5Z"
				/>
			</svg>
			<span>View on {linkHost ?? primaryLink}</span>
		</a>
	{/if}
</div>

<style>
	.zotero-reference {
		margin: 0;
	}

	.citation {
		margin: 0 0 0.35rem;
		line-height: 1.55;
		color: var(--color-text, #222);
	}

	/* Neutralise tout style global (badges, notes de bas de page, etc.) qui pourrait
	   s'appliquer aux éléments <sup>/<a> injectés via {@html} depuis Zotero.
	   !important nécessaire car la source du badge (framework CSS tiers ?) est inconnue. */
	.citation :global(sup) {
		background: none !important;
		color: inherit !important;
		padding: 0 !important;
		margin: 0 !important;
		border-radius: 0 !important;
		display: inline !important;
		width: auto !important;
		height: auto !important;
		vertical-align: super !important;
		font-size: 0.7em !important;
		line-height: 0 !important;
		font-weight: inherit !important;
	}

	.citation :global(a) {
		color: inherit;
		text-decoration: underline;
		text-decoration-color: var(--color-border, #ccc);
	}

	.citation :global(i),
	.citation :global(em) {
		font-style: italic;
	}

	.view-link {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.85rem;
		color: var(--color-text-muted, #666);
		text-decoration: none;
	}

	.view-link:hover {
		color: var(--color-accent, #2a5caa);
		text-decoration: underline;
	}

	.view-link-icon {
		flex-shrink: 0;
	}
</style>