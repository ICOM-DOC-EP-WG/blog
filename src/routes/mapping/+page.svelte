<script lang="ts">
	import * as config from '$lib/config';

	// ── Types ──
	type WikiProject = {
		project: string;
		projectLabel: string;
		description?: string;
		type?: string;
		affiliation?: string;
		teamMembers?: string;
		start?: string;
		end?: string;
		country?: string;
		coordinates?: string;
		links?: string;
		subjects?: string;
	};

	type ParsedProject = WikiProject & {
		qid: string;
		lat?: number;
		lng?: number;
		startYear?: number;
		endYear?: number;
	};

	// ── Requête SPARQL ──
	const SPARQL_QUERY = `
SELECT DISTINCT
  ?project
  ?projectLabel
  ?description
  (GROUP_CONCAT(DISTINCT ?typeLabel; SEPARATOR=", ") AS ?type)
  (GROUP_CONCAT(DISTINCT ?affiliationLabel; SEPARATOR=", ") AS ?affiliation)
  (GROUP_CONCAT(DISTINCT ?memberLabel; SEPARATOR="; ") AS ?teamMembers)
  (SAMPLE(?startDate) AS ?start)
  (SAMPLE(?endDate) AS ?end)
  (GROUP_CONCAT(DISTINCT ?countryLabel; SEPARATOR=", ") AS ?country)
  (SAMPLE(?coordinates) AS ?coordinates)
  (GROUP_CONCAT(DISTINCT ?link; SEPARATOR=", ") AS ?links)
  (GROUP_CONCAT(DISTINCT ?subjectLabel; SEPARATOR=", ") AS ?subjects)
WHERE {
  ?project wdt:P921 wd:Q788790 .
  ?project wdt:P921 ?otherSubject .
  VALUES ?otherSubject { wd:Q464980 wd:Q35140 wd:Q213156 }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
  OPTIONAL { ?project schema:description ?description . FILTER(LANG(?description) IN ("fr", "en")) }
  OPTIONAL { ?project wdt:P31 ?type . }
  OPTIONAL { ?project wdt:P1416 ?affiliation . }
  OPTIONAL { ?project wdt:P571 ?startDate . }
  OPTIONAL { ?project wdt:P576 ?endDate . }
  OPTIONAL { ?project wdt:P17 ?country . }
  OPTIONAL { ?project wdt:P625 ?coordinates . }
  OPTIONAL { ?project wdt:P856 ?link . }
  OPTIONAL { ?project wdt:P921 ?subject . }
  OPTIONAL { ?project wdt:P50 ?member . }
}
GROUP BY ?project ?projectLabel ?description
LIMIT 100`.trim();

	const WIKIDATA_ENDPOINT = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(SPARQL_QUERY)}`;

	// ── Chargement des données ──
	let projects = $state<ParsedProject[]>([]);
	let loading = $state(true);
	let error = $state('');

	const parseCoordinates = (coord: string | undefined): { lat: number; lng: number } | null => {
		if (!coord) return null;
		const match = coord.match(/Point\(([-.0-9]+)\s([-.0-9]+)\)/);
		if (match) return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
		return null;
	};

	const parseYear = (dateStr: string | undefined): number | undefined => {
		if (!dateStr) return undefined;
		const match = dateStr.match(/\d{4}/);
		return match ? parseInt(match[0]) : undefined;
	};

	const extractQid = (url: string): string => {
		const match = url.match(/Q\d+/);
		return match ? match[0] : url;
	};

	const loadProjects = async () => {
		try {
			const res = await fetch(WIKIDATA_ENDPOINT, {
				headers: { Accept: 'application/sparql-results+json' }
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			const bindings = data.results.bindings as Record<string, { value: string }>[];

			projects = bindings.map((b) => {
				const raw: WikiProject = {
					project: b.project?.value ?? '',
					projectLabel: b.projectLabel?.value ?? '',
					description: b.description?.value,
					type: b.type?.value,
					affiliation: b.affiliation?.value,
					teamMembers: b.teamMembers?.value,
					start: b.start?.value,
					end: b.end?.value,
					country: b.country?.value,
					coordinates: b.coordinates?.value,
					links: b.links?.value,
					subjects: b.subjects?.value
				};
				const coords = parseCoordinates(raw.coordinates);
				return {
					...raw,
					qid: extractQid(raw.project),
					lat: coords?.lat,
					lng: coords?.lng,
					startYear: parseYear(raw.start),
					endYear: parseYear(raw.end)
				};
			});
		} catch (e) {
			error = e instanceof Error ? e.message : 'Erreur inconnue';
		} finally {
			loading = false;
		}
	};

	// Charger au montage
	$effect(() => {
		loadProjects();
	});

	// ── Vue active ──
	type View = 'table' | 'map' | 'timeline';
	let activeView = $state<View>('table');

	// ── Filtres table ──
	let searchQuery = $state('');
	let filterCountry = $state('');

	const allCountries = $derived(
		Array.from(new Set(projects.map((p) => p.country).filter(Boolean))).sort()
	);

	const filtered = $derived(
		projects.filter((p) => {
			const q = searchQuery.trim().toLowerCase();
			const matchSearch =
				!q ||
				p.projectLabel.toLowerCase().includes(q) ||
				(p.description ?? '').toLowerCase().includes(q) ||
				(p.affiliation ?? '').toLowerCase().includes(q) ||
				(p.country ?? '').toLowerCase().includes(q);
			const matchCountry = !filterCountry || p.country === filterCountry;
			return matchSearch && matchCountry;
		})
	);

	// ── Timeline ──
	const timelineProjects = $derived(
		projects
			.filter((p) => p.startYear)
			.sort((a, b) => (a.startYear ?? 0) - (b.startYear ?? 0))
	);

	const minYear = $derived(Math.min(...timelineProjects.map((p) => p.startYear ?? 9999)));
	const maxYear = $derived(Math.max(...timelineProjects.map((p) => p.startYear ?? 0), new Date().getFullYear()));

	const timelinePos = (year: number) =>
		timelineProjects.length > 1
			? ((year - minYear) / (maxYear - minYear)) * 100
			: 50;

	// ── Carte (Leaflet via CDN) ──
	let mapContainer = $state<HTMLDivElement | null>(null);
	let mapInitialized = $state(false);

	$effect(() => {
		if (activeView === 'map' && mapContainer && !mapInitialized && !loading) {
			mapInitialized = true;
			initMap();
		}
	});

	const initMap = async () => {
		// Charger Leaflet dynamiquement
		if (typeof window === 'undefined') return;

		const L = await import('https://unpkg.com/leaflet@1.9.4/dist/leaflet-src.esm.js' as any);

		const map = L.map(mapContainer).setView([20, 0], 2);
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '© OpenStreetMap contributors'
		}).addTo(map);

		const mapProjects = projects.filter((p) => p.lat && p.lng);
		if (mapProjects.length === 0) return;

		mapProjects.forEach((p) => {
			const marker = L.marker([p.lat!, p.lng!]);
			marker.bindPopup(`
				<strong>${p.projectLabel}</strong><br/>
				${p.description ? `<em>${p.description}</em><br/>` : ''}
				${p.country ? `📍 ${p.country}<br/>` : ''}
				${p.startYear ? `📅 ${p.startYear}${p.endYear ? ` – ${p.endYear}` : ''}` : ''}
				<br/><a href="https://www.wikidata.org/wiki/${p.qid}" target="_blank" rel="noopener">Wikidata →</a>
			`);
			marker.addTo(map);
		});

		if (mapProjects.length > 0) {
			const bounds = L.latLngBounds(mapProjects.map((p) => [p.lat!, p.lng!]));
			map.fitBounds(bounds, { padding: [40, 40] });
		}
	};
</script>

<svelte:head>
	<title>Cartographie | {config.siteTitle}</title>
	<meta name="description" content="Cartographie des projets de documentation d'expositions et performances référencés dans Wikidata." />
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</svelte:head>

<div class="map-layout">
	<div class="map-header">
		<h1>Cartographie des projets</h1>
		<p class="map-subtitle">
			Projets de documentation d'expositions et performances référencés dans Wikidata.
			<a href="https://query.wikidata.org/#{encodeURIComponent(SPARQL_QUERY)}" target="_blank" rel="noopener">
				Voir la requête SPARQL →
			</a>
		</p>
	</div>

	{#if loading}
		<div class="map-loading">
			<span class="map-spinner"></span>
			Chargement des données Wikidata…
		</div>
	{:else if error}
		<div class="map-error">
			⚠️ Erreur lors du chargement : {error}
			<button onclick={loadProjects}>Réessayer</button>
		</div>
	{:else}
		<div class="map-stats">
			<span>{projects.length} projet{projects.length !== 1 ? 's' : ''}</span>
			{#if projects.filter(p => p.lat).length > 0}
				<span>· {projects.filter(p => p.lat).length} géolocalisé{projects.filter(p => p.lat).length !== 1 ? 's' : ''}</span>
			{/if}
			{#if timelineProjects.length > 0}
				<span>· {timelineProjects.length} daté{timelineProjects.length !== 1 ? 's' : ''}</span>
			{/if}
		</div>

		<!-- Onglets de vue -->
		<div class="map-tabs" role="tablist">
			<button
				role="tab"
				aria-selected={activeView === 'table'}
				class="map-tab"
				class:active={activeView === 'table'}
				onclick={() => (activeView = 'table')}
			>
				Tableau
			</button>
			<button
				role="tab"
				aria-selected={activeView === 'map'}
				class="map-tab"
				class:active={activeView === 'map'}
				onclick={() => (activeView = 'map')}
			>
				Carte
			</button>
			<button
				role="tab"
				aria-selected={activeView === 'timeline'}
				class="map-tab"
				class:active={activeView === 'timeline'}
				onclick={() => (activeView = 'timeline')}
			>
				Chronologie
			</button>
		</div>

		<!-- Vue Tableau -->
		{#if activeView === 'table'}
			<div class="map-toolbar">
				<div class="map-search-wrap">
					<span aria-hidden="true">🔍</span>
					<input
						type="search"
						class="map-search"
						placeholder="Rechercher projets, pays, institutions…"
						bind:value={searchQuery}
						aria-label="Recherche"
					/>
				</div>
				{#if allCountries.length > 1}
					<select class="map-select" bind:value={filterCountry} aria-label="Filtrer par pays">
						<option value="">Tous les pays</option>
						{#each allCountries as country}
							<option value={country}>{country}</option>
						{/each}
					</select>
				{/if}
				<span class="map-count">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
			</div>

			{#if filtered.length === 0}
				<div class="map-empty">
					<p>Aucun projet ne correspond à ces critères.</p>
					<button onclick={() => { searchQuery = ''; filterCountry = ''; }}>Réinitialiser</button>
				</div>
			{:else}
				<div class="map-table-wrap">
					<table class="map-table">
						<thead>
							<tr>
								<th>Projet</th>
								<th>Description</th>
								<th>Pays</th>
								<th>Institution</th>
								<th>Début</th>
								<th>Sujets</th>
								<th>Lien</th>
							</tr>
						</thead>
						<tbody>
							{#each filtered as p (p.qid)}
								<tr>
									<td class="map-td-title">
										<a
											href="https://www.wikidata.org/wiki/{p.qid}"
											target="_blank"
											rel="noopener noreferrer"
										>
											{p.projectLabel || p.qid}
										</a>
									</td>
									<td class="map-td-desc">{p.description ?? '—'}</td>
									<td>{p.country || '—'}</td>
									<td>{p.affiliation || '—'}</td>
									<td>{p.startYear ?? '—'}</td>
									<td class="map-td-subjects">
										{#if p.subjects}
											{#each p.subjects.split(', ') as subject}
												<span class="map-subject-chip">{subject}</span>
											{/each}
										{:else}
											—
										{/if}
									</td>
									<td>
										{#if p.links}
											<a href={p.links.split(', ')[0]} target="_blank" rel="noopener noreferrer">↗</a>
										{:else}
											—
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

		<!-- Vue Carte -->
		{:else if activeView === 'map'}
			{#if projects.filter(p => p.lat).length === 0}
				<div class="map-empty">
					<p>Aucun projet géolocalisé pour l'instant.</p>
					<p>Ajoutez des coordonnées (P625) ou un pays (P17) aux fiches Wikidata pour les voir apparaître ici.</p>
					<a href="https://www.wikidata.org" target="_blank" rel="noopener">Contribuer sur Wikidata →</a>
				</div>
			{:else}
				<div class="map-leaflet" bind:this={mapContainer}></div>
			{/if}

		<!-- Vue Chronologie -->
		{:else if activeView === 'timeline'}
			{#if timelineProjects.length === 0}
				<div class="map-empty">
					<p>Aucun projet daté pour l'instant.</p>
					<p>Ajoutez une date de début (P571) aux fiches Wikidata pour les voir apparaître ici.</p>
					<a href="https://www.wikidata.org" target="_blank" rel="noopener">Contribuer sur Wikidata →</a>
				</div>
			{:else}
				<div class="timeline">
					<div class="timeline-axis">
						<div class="timeline-line"></div>
						{#each timelineProjects as p (p.qid)}
							<div
								class="timeline-item"
								style="left: {timelinePos(p.startYear!)}%"
							>
								<div class="timeline-dot"></div>
								<div class="timeline-card">
									<span class="timeline-year">{p.startYear}</span>
									<a
										href="https://www.wikidata.org/wiki/{p.qid}"
										target="_blank"
										rel="noopener noreferrer"
										class="timeline-title"
									>
										{p.projectLabel}
									</a>
									{#if p.country}
										<span class="timeline-country">{p.country}</span>
									{/if}
									{#if p.endYear}
										<span class="timeline-end">→ {p.endYear}</span>
									{/if}
								</div>
							</div>
						{/each}
					</div>
					<div class="timeline-labels">
						<span>{minYear}</span>
						<span>{maxYear}</span>
					</div>
				</div>
			{/if}
		{/if}

		<footer class="map-footer">
			Données issues de <a href="https://www.wikidata.org" target="_blank" rel="noopener">Wikidata</a>
			sous licence <a href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank" rel="noopener">CC0</a>.
			<a href="/projects">Voir aussi les projets du groupe →</a>
		</footer>
	{/if}
</div>

<style>
	.map-layout {
		padding-bottom: 3rem;
	}

	/* En-tête */
	.map-header {
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid var(--color-link, #1a3f7a);
	}

	.map-header h1 {
		margin: 0 0 0.4rem;
	}

	.map-subtitle {
		margin: 0;
		font-size: 0.9rem;
		color: var(--color-text-secondary, #666);
	}

	/* Stats */
	.map-stats {
		font-size: 0.85rem;
		color: var(--color-text-secondary, #888);
		margin-bottom: 1rem;
		display: flex;
		gap: 0.25rem;
		flex-wrap: wrap;
	}

	/* Onglets */
	.map-tabs {
		display: flex;
		gap: 0;
		border-bottom: 2px solid var(--color-bg-secondary, #e0e0e0);
		margin-bottom: 1.25rem;
	}

	.map-tab {
		padding: 0.5rem 1.25rem;
		border: none;
		border-bottom: 2px solid transparent;
		margin-bottom: -2px;
		background: none;
		cursor: pointer;
		font-size: 0.9rem;
		color: var(--color-text-secondary, #777);
		font-weight: 500;
	}

	.map-tab:hover {
		color: var(--color-link, #1a3f7a);
	}

	.map-tab.active {
		color: var(--color-link, #1a3f7a);
		border-bottom-color: var(--color-link, #1a3f7a);
		font-weight: 600;
	}

	/* Toolbar */
	.map-toolbar {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		align-items: center;
		margin-bottom: 1rem;
	}

	.map-search-wrap {
		position: relative;
		flex: 1;
		min-width: 200px;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.map-search {
		flex: 1;
		padding: 0.45rem 0.75rem;
		border: 1px solid var(--color-bg-secondary, #ccc);
		border-radius: 4px;
		font-size: 0.9rem;
	}

	.map-select {
		padding: 0.45rem 0.65rem;
		border: 1px solid var(--color-bg-secondary, #ccc);
		border-radius: 4px;
		font-size: 0.875rem;
	}

	.map-count {
		font-size: 0.82rem;
		color: var(--color-text-secondary, #888);
		white-space: nowrap;
	}

	/* Table */
	.map-table-wrap {
		overflow-x: auto;
	}

	.map-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
		display: table;
		white-space: normal;
	}

	.map-table th {
		text-align: left;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-secondary, #888);
		padding: 0.5rem 0.75rem;
		border-bottom: 2px solid var(--color-bg-secondary, #e0e0e0);
		background: none;
	}

	.map-table td {
		padding: 0.6rem 0.75rem;
		border-bottom: 1px solid var(--color-bg-secondary, #f0f0f0);
		vertical-align: top;
	}

	.map-table tr:hover td {
		background: var(--color-accent, #f5f7fc);
	}

	.map-td-title {
		font-weight: 600;
		min-width: 150px;
	}

	.map-td-desc {
		color: var(--color-text-secondary, #666);
		font-size: 0.82rem;
		max-width: 280px;
	}

	.map-td-subjects {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.map-subject-chip {
		display: inline-block;
		font-size: 0.7rem;
		padding: 0.15rem 0.45rem;
		border-radius: 999px;
		background: var(--color-accent, #e8eef8);
		color: var(--color-link, #1a3f7a);
	}

	/* Carte */
	.map-leaflet {
		height: 500px;
		width: 100%;
		border-radius: 6px;
		border: 1px solid var(--color-bg-secondary, #e0e0e0);
	}

	/* Timeline */
	.timeline {
		margin: 2rem 0;
		padding: 0 1rem;
	}

	.timeline-axis {
		position: relative;
		height: 180px;
		margin-bottom: 0.5rem;
	}

	.timeline-line {
		position: absolute;
		top: 80px;
		left: 0;
		right: 0;
		height: 2px;
		background: var(--color-link, #1a3f7a);
		opacity: 0.25;
	}

	.timeline-item {
		position: absolute;
		transform: translateX(-50%);
		top: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.timeline-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--color-link, #1a3f7a);
		margin-top: 75px;
		flex-shrink: 0;
		z-index: 1;
	}

	.timeline-card {
		position: absolute;
		top: 0;
		width: 140px;
		text-align: center;
		font-size: 0.78rem;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.timeline-year {
		font-weight: 700;
		color: var(--color-link, #1a3f7a);
		font-size: 0.85rem;
	}

	.timeline-title {
		font-weight: 500;
		font-size: 0.75rem;
		line-height: 1.3;
		color: var(--color-text, #222);
		text-decoration: none;
	}

	.timeline-title:hover {
		color: var(--color-link, #1a3f7a);
		text-decoration: underline;
	}

	.timeline-country,
	.timeline-end {
		font-size: 0.7rem;
		color: var(--color-text-secondary, #888);
	}

	.timeline-labels {
		display: flex;
		justify-content: space-between;
		font-size: 0.75rem;
		color: var(--color-text-secondary, #999);
		padding: 0 0.5rem;
		border-top: 1px solid var(--color-bg-secondary, #e0e0e0);
		padding-top: 0.4rem;
	}

	/* États vides / loading */
	.map-loading {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 3rem 0;
		color: var(--color-text-secondary, #888);
		font-size: 0.9rem;
	}

	.map-spinner {
		display: inline-block;
		width: 18px;
		height: 18px;
		border: 2px solid var(--color-bg-secondary, #ccc);
		border-top-color: var(--color-link, #1a3f7a);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.map-error {
		padding: 1rem;
		border-left: 3px solid #c0392b;
		color: #c0392b;
		background: #fdf0ee;
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.map-empty {
		padding: 3rem 0;
		text-align: center;
		color: var(--color-text-secondary, #888);
		font-size: 0.9rem;
	}

	.map-empty p {
		margin: 0.3rem 0;
	}

	/* Footer */
	.map-footer {
		margin-top: 2.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-bg-secondary, #e0e0e0);
		font-size: 0.8rem;
		color: var(--color-text-secondary, #999);
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	/* Responsive */
	@media (max-width: 600px) {
		.map-table th:nth-child(n+4),
		.map-table td:nth-child(n+4) {
			display: none;
		}

		.timeline-card {
			width: 100px;
			font-size: 0.68rem;
		}
	}
</style>