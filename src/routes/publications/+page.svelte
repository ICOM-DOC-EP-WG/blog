<script lang="ts">
	import type { PageProps } from './$types';
	import * as config from '$lib/config';
	import ZoteroReference from '$lib/components/ZoteroReference.svelte';
	import ZoteroAddedMeta from '$lib/components/ZoteroAddedMeta.svelte';
	import { formatDisplayDateTime } from '$lib/utilities/dates';

	let { data }: PageProps = $props();

	const ITEM_TYPE_LABELS: Record<string, string> = {
		book: 'Book',
		journalArticle: 'Journal article',
		magazineArticle: 'Magazine article',
		newspaperArticle: 'Newspaper article',
		bookSection: 'Book section',
		conferencePaper: 'Conference paper',
		encyclopediaArticle: 'Encyclopedia article',
		dictionaryEntry: 'Dictionary entry',
		presentation: 'Presentation',
		document: 'Document',
		report: 'Report',
		thesis: 'Thesis',
		webpage: 'Web page',
		blogPost: 'Blog post'
	};

	const publications = $derived(data.zoteroPublications.publications ?? []);
	const updatedAt = $derived(formatDisplayDateTime(data.zoteroPublications.updatedAt, 'en-GB'));

	// --- Filter state ---
	let searchQuery = $state('');
	let selectedType = $state('');
	let selectedTag = $state('');
	let sortOrder = $state<'date-desc' | 'date-asc' | 'title-asc'>('date-desc');
	let showFilters = $state(false);

	// --- Données dérivées pour les facettes ---
	const allTypes = $derived(
		Array.from(new Set(publications.map((p) => p.itemType)))
			.filter(Boolean)
			.sort((a, b) => (ITEM_TYPE_LABELS[a] ?? a).localeCompare(ITEM_TYPE_LABELS[b] ?? b, 'en'))
	);

	const allTags = $derived(
		Array.from(new Set(publications.flatMap((p) => p.tags ?? [])))
			.filter(Boolean)
			.sort((a, b) => a.localeCompare(b, 'en'))
	);

	// --- Filtrage et tri ---
	const filtered = $derived.by(() => {
		let result = publications;

		if (searchQuery.trim()) {
			const q = searchQuery.trim().toLowerCase();
			result = result.filter(
				(p) =>
					p.title?.toLowerCase().includes(q) ||
					p.formattedCitation?.toLowerCase().includes(q) ||
					p.tags?.some((t) => t.toLowerCase().includes(q)) ||
					p.publicationTitle?.toLowerCase().includes(q) ||
					p.creators?.some(
						(c) =>
							c.lastName?.toLowerCase().includes(q) ||
							c.firstName?.toLowerCase().includes(q) ||
							c.name?.toLowerCase().includes(q)
					)
			);
			}

		if (selectedType) {
			result = result.filter((p) => p.itemType === selectedType);
		}

		if (selectedTag) {
			result = result.filter((p) => p.tags?.includes(selectedTag));
		}

		if (sortOrder === 'date-asc') {
			result = [...result].sort(
				(a, b) => toTimestamp(a.parsedDate) - toTimestamp(b.parsedDate)
			);
		} else if (sortOrder === 'date-desc') {
			result = [...result].sort(
				(a, b) => toTimestamp(b.parsedDate) - toTimestamp(a.parsedDate)
			);
		} else if (sortOrder === 'title-asc') {
			result = [...result].sort((a, b) => (a.title ?? '').localeCompare(b.title ?? '', 'en'));
		}

		return result;
	});

	const toTimestamp = (date: string | undefined): number => {
		if (!date) return 0;
		const ts = Date.parse(`${date}T00:00:00Z`);
		return isNaN(ts) ? 0 : ts;
	};

	const hasActiveFilters = $derived(
		searchQuery.trim() !== '' || selectedType !== '' || selectedTag !== ''
	);

	function clearFilters() {
		searchQuery = '';
		selectedType = '';
		selectedTag = '';
	}

	// Counts by type for the filter facets
	const countByType = $derived(
		Object.fromEntries(
			allTypes.map((type) => [
				type,
				publications.filter((p) => p.itemType === type).length
			])
		)
	);

	const countByTag = $derived(
		Object.fromEntries(
			allTags.map((tag) => [
				tag,
				publications.filter((p) => p.tags?.includes(tag)).length
			])
		)
	);
</script>

<svelte:head>
	<title>Bibliography | {config.siteTitle}</title>
	<meta name="description" content="Bibliography of the ICOM Working Group on Exhibition and Performance Documentation." />
</svelte:head>

<div class="bib-layout">
	{#if data.zoteroPublications.error}
		<p class="error">⚠️ {data.zoteroPublications.error}</p>
	{:else}
		<!-- Page heading -->
		<header class="bib-header">
			<div>
				<h1>Bibliography</h1>
			</div>
			<p class="bib-count">
				<strong>{filtered.length}</strong> {filtered.length === 1 ? 'item' : 'items'}
				{#if publications.length !== filtered.length}
					<span class="bib-count-total">of {publications.length}</span>
				{/if}
			</p>
		</header>

		<!-- Search and controls -->
		<div class="bib-toolbar">
			<div class="bib-search-wrap">
				<span class="bib-search-icon" aria-hidden="true"></span>
				<input
					class="bib-search"
					type="search"
					placeholder="Search titles, authors, keywords..."
					bind:value={searchQuery}
					aria-label="Search the bibliography"
				/>
				{#if searchQuery}
					<button class="bib-search-clear" onclick={() => (searchQuery = '')} aria-label="Clear search">×</button>
				{/if}
			</div>

			<div class="bib-controls">
				<button
					class="bib-filter-toggle"
					class:active={showFilters}
					onclick={() => (showFilters = !showFilters)}
					aria-expanded={showFilters}
				>
					<span>Filters</span>
					{#if hasActiveFilters}<span class="bib-filter-badge"></span>{/if}
				</button>

				<label class="bib-sort-label" for="bib-sort">Sort</label>
				<select id="bib-sort" class="bib-sort" bind:value={sortOrder}>
					<option value="date-desc">Newest first</option>
					<option value="date-asc">Oldest first</option>
					<option value="title-asc">Title (A–Z)</option>
				</select>
			</div>
		</div>

		<!-- Filter panel -->
		{#if showFilters}
			<div class="bib-filters">
				<div class="bib-filter-group">
					<h3 class="bib-filter-heading">Document type</h3>
					<ul class="bib-facet-list">
						<li>
							<button
								class="bib-facet-item"
								class:selected={selectedType === ''}
								onclick={() => (selectedType = '')}
							>
								<span class="bib-facet-label">All types</span>
								<span class="bib-facet-count">{publications.length}</span>
							</button>
						</li>
						{#each allTypes as type}
							<li>
								<button
									class="bib-facet-item"
									class:selected={selectedType === type}
									onclick={() => (selectedType = selectedType === type ? '' : type)}
								>
									<span class="bib-facet-label">{ITEM_TYPE_LABELS[type] ?? type}</span>
									<span class="bib-facet-count">{countByType[type]}</span>
								</button>
							</li>
						{/each}
					</ul>
				</div>

				{#if allTags.length > 0}
					<div class="bib-filter-group">
						<h3 class="bib-filter-heading">Keywords</h3>
						<ul class="bib-facet-list bib-facet-tags">
							<li>
								<button
									class="bib-tag-item"
									class:selected={selectedTag === ''}
									onclick={() => (selectedTag = '')}
								>
									All keywords
								</button>
							</li>
							{#each allTags as tag}
								<li>
									<button
										class="bib-tag-item"
										class:selected={selectedTag === tag}
										onclick={() => (selectedTag = selectedTag === tag ? '' : tag)}
									>
										{tag}
										<span class="bib-facet-count">{countByTag[tag]}</span>
									</button>
								</li>
							{/each}
						</ul>
					</div>
				{/if}

				{#if hasActiveFilters}
					<button class="bib-clear-filters" onclick={clearFilters}>
						Clear all filters
					</button>
				{/if}
			</div>
		{/if}

		<!-- Active filters -->
		{#if hasActiveFilters}
			<div class="bib-active-filters" role="status" aria-live="polite">
				{#if selectedType}
					<span class="bib-chip">
						{ITEM_TYPE_LABELS[selectedType] ?? selectedType}
						<button onclick={() => (selectedType = '')} aria-label="Remove type filter">×</button>
					</span>
				{/if}
				{#if selectedTag}
					<span class="bib-chip">
						#{selectedTag}
						<button onclick={() => (selectedTag = '')} aria-label="Remove keyword filter">×</button>
					</span>
				{/if}
				{#if searchQuery.trim()}
					<span class="bib-chip">
						“{searchQuery.trim()}”
						<button onclick={() => (searchQuery = '')} aria-label="Clear search">×</button>
					</span>
				{/if}
			</div>
		{/if}

		<!-- Results -->
		<main class="bib-results">
			{#if filtered.length === 0}
				<div class="bib-empty">
					<p>No results match these filters.</p>
					{#if hasActiveFilters}
						<button class="bib-clear-filters" onclick={clearFilters}>Clear all filters</button>
					{/if}
				</div>
			{:else}
				<ul class="publications-list">
					{#each filtered as publication (publication.key)}
						<li class="bib-item">
							<span class="bib-item-type">{ITEM_TYPE_LABELS[publication.itemType] ?? publication.itemType}</span>
							<ZoteroReference {publication} />
							{#if publication.tags && publication.tags.length > 0}
								<ul class="bib-item-tags" aria-label="Keywords">
									{#each publication.tags as tag}
										<li>
											<button
												class="bib-tag-chip"
												onclick={() => {
													selectedTag = tag;
													showFilters = true;
												}}
											>#{tag}</button>
										</li>
									{/each}
								</ul>
							{/if}
							<ZoteroAddedMeta {publication} />
						</li>
					{/each}
				</ul>
			{/if}
		</main>

		<!-- Source information -->
		{#if data.zoteroPublications.sourceUrl}
			<footer class="bib-footer">
				{#if updatedAt}Updated {updatedAt} ·{/if}
				<a href={data.zoteroPublications.sourceUrl} target="_blank" rel="noopener noreferrer">
					View Zotero library
				</a>
			</footer>
		{/if}
	{/if}
</div>

<style>
	.bib-layout {
		padding-bottom: 2rem;
	}

	.bib-header {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		padding: clamp(1.5rem, 5vw, 3.5rem) 0 1.5rem;
		border-bottom: 1px solid var(--color-shadow);
		margin-bottom: 1.25rem;
	}

	.bib-eyebrow {
		margin: 0 0 0.6rem;
		color: var(--color-secondary);
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
	}

	.bib-header h1 {
		margin: 0;
		font-size: clamp(2.2rem, 6vw, 4rem);
		line-height: 1.05;
	}

	.bib-count {
		margin: 0;
		margin-bottom: 0.2rem;
		font-size: 0.88rem;
		color: var(--color-text-secondary);
	}

	.bib-count strong {
		color: var(--color-link);
	}

	.bib-count-total {
		margin-left: 0.25rem;
		opacity: 0.7;
	}

	.bib-toolbar {
		display: flex;
		gap: 0.65rem;
		flex-wrap: wrap;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.bib-search-wrap {
		position: relative;
		flex: 1;
		min-width: min(220px, 100%);
	}

	.bib-search-icon {
		position: absolute;
		left: 0.65rem;
		top: 50%;
		transform: translateY(-50%);
		width: 0.8rem;
		height: 0.8rem;
		border: 1.5px solid currentColor;
		border-radius: 50%;
		color: var(--color-text-secondary);
		pointer-events: none;
	}

	.bib-search-icon::after {
		position: absolute;
		right: -0.28rem;
		bottom: -0.18rem;
		width: 0.35rem;
		border-top: 1.5px solid currentColor;
		content: '';
		transform: rotate(45deg);
	}

	.bib-search {
		width: 100%;
		min-height: 2.75rem;
		padding: 0.55rem 2.2rem 0.55rem 2.2rem;
		border: 1px solid var(--color-shadow);
		border-radius: 4px;
		font-size: 0.92rem;
		background: var(--color-bg);
		color: var(--color-text);
		box-sizing: border-box;
	}

	.bib-search:focus-visible {
		border-color: var(--color-link);
		outline: 2px solid color-mix(in srgb, var(--color-link) 25%, transparent);
		outline-offset: 1px;
	}

	.bib-search-clear {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		cursor: pointer;
		color: var(--color-text-secondary);
		font-size: 0.8rem;
		padding: 0.2rem;
		line-height: 1;
	}

	.bib-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.bib-filter-toggle {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		min-height: 2.75rem;
		padding: 0.45rem 0.75rem;
		border: 1px solid var(--color-shadow);
		border-radius: 4px;
		background: var(--color-bg);
		cursor: pointer;
		font-size: 0.86rem;
		color: var(--color-text);
		position: relative;
	}

	.bib-filter-toggle.active {
		border-color: var(--color-secondary);
		color: var(--color-secondary);
	}

	.bib-filter-badge {
		display: inline-block;
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--color-accent, #2a5caa);
	}

	.bib-sort-label {
		font-size: 0.85rem;
		color: var(--color-text-secondary);
		white-space: nowrap;
	}

	.bib-sort {
		padding: 0.45rem 0.65rem;
		min-height: 2.75rem;
		border: 1px solid var(--color-shadow);
		border-radius: 4px;
		font-size: 0.875rem;
		background: var(--color-bg);
		color: var(--color-text);
	}

	.bib-filters {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-shadow);
		border-radius: 4px;
		padding: 1.25rem;
		margin-bottom: 1rem;
	}

	.bib-filter-group {
		flex: 1;
		min-width: 180px;
	}

	.bib-filter-heading {
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-secondary);
		margin: 0 0 0.6rem 0;
	}

	.bib-facet-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.bib-facet-tags {
		flex-direction: row;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.bib-facet-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding: 0.3rem 0.5rem;
		border: 1px solid transparent;
		border-radius: 3px;
		background: none;
		cursor: pointer;
		font-size: 0.875rem;
		text-align: left;
		color: var(--color-text);
		gap: 0.5rem;
	}

	.bib-facet-item:hover {
		background: var(--color-bg);
		border-color: var(--color-shadow);
	}

	.bib-facet-item.selected {
		background: var(--color-link);
		color: var(--color-bg);
		border-color: var(--color-link);
	}

	.bib-facet-item.selected .bib-facet-count {
		color: rgba(255, 255, 255, 0.8);
	}

	.bib-facet-count {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		flex-shrink: 0;
	}

	.bib-tag-item {
		padding: 0.25rem 0.6rem;
		border: 1px solid var(--color-shadow);
		border-radius: 4px;
		background: var(--color-bg);
		cursor: pointer;
		font-size: 0.8rem;
		color: var(--color-text);
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}

	.bib-tag-item:hover {
		border-color: var(--color-secondary);
		color: var(--color-secondary);
	}

	.bib-tag-item.selected {
		background: var(--color-link);
		color: var(--color-bg);
		border-color: var(--color-link);
	}

	.bib-tag-item.selected .bib-facet-count {
		color: rgba(255, 255, 255, 0.75);
	}

	.bib-active-filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 0.75rem;
	}

	.bib-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.2rem 0.5rem 0.2rem 0.65rem;
		background: var(--color-secondary-accent);
		color: var(--color-secondary);
		border-radius: 3px;
		font-size: 0.8rem;
	}

	.bib-chip button {
		background: none;
		border: none;
		cursor: pointer;
		color: inherit;
		font-size: 0.7rem;
		padding: 0;
		line-height: 1;
		opacity: 0.7;
	}

	.bib-chip button:hover {
		opacity: 1;
	}

	.bib-clear-filters {
		background: none;
		border: 1px solid var(--color-shadow);
		border-radius: 4px;
		padding: 0.3rem 0.75rem;
		cursor: pointer;
		font-size: 0.85rem;
		color: var(--color-text-secondary);
		align-self: flex-start;
	}

	.bib-clear-filters:hover {
		border-color: var(--color-link);
		color: var(--color-link);
	}

	.publications-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.bib-item {
		position: relative;
		padding: 1.25rem 0 1.25rem 1rem;
		border-bottom: 1px solid var(--color-shadow);
		border-left: 3px solid transparent;
		transition: border-color 150ms ease, background-color 150ms ease;
	}

	.bib-item:hover,
	.bib-item:focus-within {
		border-left-color: var(--color-secondary);
		background: linear-gradient(90deg, var(--color-secondary-accent), transparent 70%);
	}

	.bib-item:last-child {
		border-bottom: none;
	}

	.bib-item-type {
		display: inline-block;
		font-size: 0.7rem;
		text-transform: uppercase;
		color: var(--color-text-secondary);
		margin-bottom: 0.3rem;
		font-weight: 600;
	}

	.bib-item-tags {
		list-style: none;
		padding: 0;
		margin: 0.5rem 0 0 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.bib-tag-chip {
		background: none;
		border: 1px solid var(--color-border, #ddd);
		border-radius: 3px;
		padding: 0.2rem 0.5rem;
		font-size: 0.75rem;
		cursor: pointer;
		color: var(--color-text-secondary);
	}

	.bib-tag-chip:hover {
		border-color: var(--color-secondary);
		color: var(--color-secondary);
	}

	.bib-empty {
		padding: 3rem 0;
		text-align: center;
		color: var(--color-text-secondary);
	}

	.bib-footer {
		margin-top: 2.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-shadow);
		font-size: 0.82rem;
		color: var(--color-text-secondary);
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
		align-items: center;
	}

	.error {
		padding: 1rem;
		border-left: 3px solid #c0392b;
		color: #c0392b;
		background: #fdf0ee;
	}

	@media (max-width: 700px) {
		.bib-toolbar {
			flex-direction: column;
			align-items: stretch;
		}

		.bib-controls {
			display: grid;
			grid-template-columns: auto auto minmax(0, 1fr);
			gap: 0.5rem;
		}

		.bib-filters {
			flex-direction: column;
		}
	}

	@media (max-width: 420px) {
		.bib-controls {
			grid-template-columns: 1fr;
		}

		.bib-sort-label {
			margin-top: 0.25rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.bib-item {
			transition: none;
		}
	}
</style>