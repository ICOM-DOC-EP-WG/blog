<script lang="ts">
	import type { PageProps } from './$types';
	import * as config from '$lib/config';
	import ZoteroReference from '$lib/components/ZoteroReference.svelte';
	import { formatDisplayDateTime } from '$lib/utilities/dates';

	let { data }: PageProps = $props();

	const ITEM_TYPE_LABELS: Record<string, string> = {
		book: 'Livre',
		journalArticle: 'Article de revue',
		magazineArticle: 'Article de magazine',
		newspaperArticle: 'Article de presse',
		bookSection: 'Chapitre de livre',
		conferencePaper: 'Article de conférence',
		encyclopediaArticle: "Article d'encyclopédie",
		dictionaryEntry: 'Entrée de dictionnaire',
		presentation: 'Présentation',
		document: 'Document',
		report: 'Rapport',
		thesis: 'Thèse / mémoire',
		webpage: 'Page web',
		blogPost: 'Billet de blogue'
	};

	const publications = $derived(data.zoteroPublications.publications ?? []);
	const updatedAt = $derived(formatDisplayDateTime(data.zoteroPublications.updatedAt, 'fr-CA'));

	// --- État des filtres ---
	let searchQuery = $state('');
	let selectedType = $state('');
	let selectedTag = $state('');
	let sortOrder = $state<'date-desc' | 'date-asc' | 'title-asc'>('date-desc');
	let showFilters = $state(false);

	// --- Données dérivées pour les facettes ---
	const allTypes = $derived(
		Array.from(new Set(publications.map((p) => p.itemType)))
			.filter(Boolean)
			.sort((a, b) => (ITEM_TYPE_LABELS[a] ?? a).localeCompare(ITEM_TYPE_LABELS[b] ?? b, 'fr'))
	);

	const allTags = $derived(
		Array.from(new Set(publications.flatMap((p) => p.tags ?? [])))
			.filter(Boolean)
			.sort((a, b) => a.localeCompare(b, 'fr'))
	);

	// --- Filtrage et tri ---
	const filtered = $derived(() => {
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
			result = [...result].sort((a, b) => (a.title ?? '').localeCompare(b.title ?? '', 'fr'));
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

	// Comptage par type pour les facettes
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
	<title>Bibliographie | {config.siteTitle}</title>
	<meta name="description" content="Bibliographie du groupe de travail ICOM sur la documentation des expositions et performances." />
</svelte:head>

<div class="bib-layout">
	{#if data.zoteroPublications.error}
		<p class="error">⚠️ {data.zoteroPublications.error}</p>
	{:else}
		<!-- En-tête -->
		<header class="bib-header">
			<h1>Bibliographie</h1>
			<p class="bib-count">
				{filtered().length} résultat{filtered().length !== 1 ? 's' : ''}
				{#if publications.length !== filtered().length}
					<span class="bib-count-total">sur {publications.length}</span>
				{/if}
			</p>
		</header>

		<!-- Barre de recherche + contrôles -->
		<div class="bib-toolbar">
			<div class="bib-search-wrap">
				<span class="bib-search-icon" aria-hidden="true">🔍</span>
				<input
					class="bib-search"
					type="search"
					placeholder="Rechercher titres, auteurs, mots-clés…"
					bind:value={searchQuery}
					aria-label="Recherche dans la bibliographie"
				/>
				{#if searchQuery}
					<button class="bib-search-clear" onclick={() => (searchQuery = '')} aria-label="Effacer la recherche">✕</button>
				{/if}
			</div>

			<div class="bib-controls">
				<button
					class="bib-filter-toggle"
					class:active={showFilters}
					onclick={() => (showFilters = !showFilters)}
					aria-expanded={showFilters}
				>
					<span>Filtres</span>
					{#if hasActiveFilters}<span class="bib-filter-badge"></span>{/if}
				</button>

				<label class="bib-sort-label" for="bib-sort">Trier</label>
				<select id="bib-sort" class="bib-sort" bind:value={sortOrder}>
					<option value="date-desc">Date (récent → ancien)</option>
					<option value="date-asc">Date (ancien → récent)</option>
					<option value="title-asc">Titre (A → Z)</option>
				</select>
			</div>
		</div>

		<!-- Panneau de filtres -->
		{#if showFilters}
			<div class="bib-filters">
				<div class="bib-filter-group">
					<h3 class="bib-filter-heading">Type de document</h3>
					<ul class="bib-facet-list">
						<li>
							<button
								class="bib-facet-item"
								class:selected={selectedType === ''}
								onclick={() => (selectedType = '')}
							>
								<span class="bib-facet-label">Tous</span>
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
						<h3 class="bib-filter-heading">Mots-clés</h3>
						<ul class="bib-facet-list bib-facet-tags">
							<li>
								<button
									class="bib-tag-item"
									class:selected={selectedTag === ''}
									onclick={() => (selectedTag = '')}
								>
									Tous
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
						Réinitialiser les filtres
					</button>
				{/if}
			</div>
		{/if}

		<!-- Filtres actifs (chips) -->
		{#if hasActiveFilters}
			<div class="bib-active-filters" role="status" aria-live="polite">
				{#if selectedType}
					<span class="bib-chip">
						{ITEM_TYPE_LABELS[selectedType] ?? selectedType}
						<button onclick={() => (selectedType = '')} aria-label="Retirer le filtre type">✕</button>
					</span>
				{/if}
				{#if selectedTag}
					<span class="bib-chip">
						#{selectedTag}
						<button onclick={() => (selectedTag = '')} aria-label="Retirer le filtre tag">✕</button>
					</span>
				{/if}
				{#if searchQuery.trim()}
					<span class="bib-chip">
						« {searchQuery.trim()} »
						<button onclick={() => (searchQuery = '')} aria-label="Effacer la recherche">✕</button>
					</span>
				{/if}
			</div>
		{/if}

		<!-- Résultats -->
		<main class="bib-results">
			{#if filtered().length === 0}
				<div class="bib-empty">
					<p>Aucun résultat pour ces critères.</p>
					{#if hasActiveFilters}
						<button class="bib-clear-filters" onclick={clearFilters}>Réinitialiser les filtres</button>
					{/if}
				</div>
			{:else}
				<ul class="publications-list">
					{#each filtered() as publication (publication.key)}
						<li class="bib-item">
							<span class="bib-item-type">{ITEM_TYPE_LABELS[publication.itemType] ?? publication.itemType}</span>
							<ZoteroReference {publication} />
							{#if publication.tags && publication.tags.length > 0}
								<ul class="bib-item-tags" aria-label="Mots-clés">
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
						</li>
					{/each}
				</ul>
			{/if}
		</main>

		<!-- Pied de page -->
		{#if data.zoteroPublications.sourceUrl}
			<footer class="bib-footer">
				{#if updatedAt}Mis à jour le {updatedAt} ·{/if}
				<a href={data.zoteroPublications.sourceUrl} target="_blank" rel="noopener noreferrer">
					Source Zotero
				</a>
			</footer>
		{/if}
	{/if}
</div>

<style>
	/* Layout */
/* Après */
.bib-layout {
    padding-bottom: 2rem;
}

	/* En-tête */
	.bib-header {
		display: flex;
		align-items: baseline;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 1.5rem;
		border-bottom: 2px solid var(--color-accent, #2a5caa);
		padding-bottom: 0.75rem;
	}

	.bib-header h1 {
		margin: 0;
		font-size: 1.75rem;
	}

	.bib-count {
		margin: 0;
		font-size: 0.9rem;
		color: var(--color-text-muted, #666);
	}

	.bib-count-total {
		margin-left: 0.25rem;
		opacity: 0.7;
	}

	/* Toolbar */
	.bib-toolbar {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		align-items: center;
		margin-bottom: 1rem;
	}

	.bib-search-wrap {
		position: relative;
		flex: 1;
		min-width: 220px;
	}

	.bib-search-icon {
		position: absolute;
		left: 0.65rem;
		top: 50%;
		transform: translateY(-50%);
		font-size: 0.85rem;
		pointer-events: none;
	}

	.bib-search {
		width: 100%;
		padding: 0.5rem 2rem 0.5rem 2rem;
		border: 1px solid var(--color-border, #ccc);
		border-radius: 4px;
		font-size: 0.95rem;
		background: var(--color-bg, #fff);
		color: var(--color-text, #222);
		box-sizing: border-box;
	}

	.bib-search:focus {
		outline: 2px solid var(--color-accent, #2a5caa);
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
		color: var(--color-text-muted, #888);
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
		padding: 0.45rem 0.85rem;
		border: 1px solid var(--color-border, #ccc);
		border-radius: 4px;
		background: var(--color-bg, #fff);
		cursor: pointer;
		font-size: 0.9rem;
		color: var(--color-text, #222);
		position: relative;
	}

	.bib-filter-toggle.active {
		border-color: var(--color-accent, #2a5caa);
		color: var(--color-accent, #2a5caa);
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
		color: var(--color-text-muted, #666);
		white-space: nowrap;
	}

	.bib-sort {
		padding: 0.45rem 0.65rem;
		border: 1px solid var(--color-border, #ccc);
		border-radius: 4px;
		font-size: 0.875rem;
		background: var(--color-bg, #fff);
		color: var(--color-text, #222);
	}

	/* Panneau filtres */
	.bib-filters {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		background: var(--color-bg-alt, #f5f5f5);
		border: 1px solid var(--color-border, #ddd);
		border-radius: 6px;
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
		color: var(--color-text-muted, #777);
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
		color: var(--color-text, #222);
		gap: 0.5rem;
	}

	.bib-facet-item:hover {
		background: var(--color-bg, #fff);
		border-color: var(--color-border, #ccc);
	}

	.bib-facet-item.selected {
		background: var(--color-accent, #2a5caa);
		color: #fff;
		border-color: var(--color-accent, #2a5caa);
	}

	.bib-facet-item.selected .bib-facet-count {
		color: rgba(255, 255, 255, 0.8);
	}

	.bib-facet-count {
		font-size: 0.75rem;
		color: var(--color-text-muted, #888);
		flex-shrink: 0;
	}

	.bib-tag-item {
		padding: 0.25rem 0.6rem;
		border: 1px solid var(--color-border, #ccc);
		border-radius: 999px;
		background: var(--color-bg, #fff);
		cursor: pointer;
		font-size: 0.8rem;
		color: var(--color-text, #333);
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}

	.bib-tag-item:hover {
		border-color: var(--color-accent, #2a5caa);
		color: var(--color-accent, #2a5caa);
	}

	.bib-tag-item.selected {
		background: var(--color-accent, #2a5caa);
		color: #fff;
		border-color: var(--color-accent, #2a5caa);
	}

	.bib-tag-item.selected .bib-facet-count {
		color: rgba(255, 255, 255, 0.75);
	}

	/* Chips filtres actifs */
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
		background: var(--color-accent-light, #e8eef8);
		color: var(--color-accent, #2a5caa);
		border-radius: 999px;
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

	/* Bouton réinitialiser */
	.bib-clear-filters {
		background: none;
		border: 1px solid var(--color-border, #ccc);
		border-radius: 4px;
		padding: 0.3rem 0.75rem;
		cursor: pointer;
		font-size: 0.85rem;
		color: var(--color-text-muted, #666);
		align-self: flex-start;
	}

	.bib-clear-filters:hover {
		border-color: var(--color-accent, #2a5caa);
		color: var(--color-accent, #2a5caa);
	}

	/* Résultats */
	.publications-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.bib-item {
		padding: 1rem 0;
		border-bottom: 1px solid var(--color-border, #e8e8e8);
	}

	.bib-item:last-child {
		border-bottom: none;
	}

	.bib-item-type {
		display: inline-block;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--color-text-muted, #888);
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
		border-radius: 999px;
		padding: 0.15rem 0.55rem;
		font-size: 0.75rem;
		cursor: pointer;
		color: var(--color-text-muted, #777);
	}

	.bib-tag-chip:hover {
		border-color: var(--color-accent, #2a5caa);
		color: var(--color-accent, #2a5caa);
	}

	/* Vide */
	.bib-empty {
		padding: 3rem 0;
		text-align: center;
		color: var(--color-text-muted, #888);
	}

	/* Footer */
	.bib-footer {
		margin-top: 2.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-border, #e8e8e8);
		font-size: 0.82rem;
		color: var(--color-text-muted, #888);
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
		align-items: center;
	}

	/* Erreur */
	.error {
		padding: 1rem;
		border-left: 3px solid #c0392b;
		color: #c0392b;
		background: #fdf0ee;
	}

	/* Responsive */
	@media (max-width: 600px) {
		.bib-toolbar {
			flex-direction: column;
			align-items: stretch;
		}

		.bib-controls {
			justify-content: space-between;
		}

		.bib-filters {
			flex-direction: column;
		}
	}
</style>