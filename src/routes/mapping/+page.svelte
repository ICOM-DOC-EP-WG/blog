<script lang="ts">
	import * as config from '$lib/config';

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
		duration?: string;
		ongoing: boolean;
	};

	const SPARQL_QUERY = `
SELECT DISTINCT
  ?project
  ?projectLabel
  ?description
  (GROUP_CONCAT(DISTINCT ?typeLabel; SEPARATOR=", ") AS ?type)
  (GROUP_CONCAT(DISTINCT ?affiliationLabel; SEPARATOR=", ") AS ?affiliation)
  (GROUP_CONCAT(DISTINCT ?memberLabel; SEPARATOR="; ") AS ?teamMembers)
  (SAMPLE(COALESCE(?startDate, ?inception)) AS ?start)
  (SAMPLE(COALESCE(?endDate, ?dissolved)) AS ?end)
  (GROUP_CONCAT(DISTINCT ?countryLabel; SEPARATOR=", ") AS ?country)
  (SAMPLE(COALESCE(?directCoords, ?cityCoords, ?countryCoords)) AS ?coordinates)
  (GROUP_CONCAT(DISTINCT ?link; SEPARATOR=", ") AS ?links)
  (GROUP_CONCAT(DISTINCT ?subjectLabel; SEPARATOR=", ") AS ?subjects)
WHERE {
  ?project wdt:P921 wd:Q788790 .
  ?project wdt:P921 ?otherSubject .
  VALUES ?otherSubject { wd:Q464980 wd:Q35140 wd:Q213156 }
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en,fr".
    ?project rdfs:label ?projectLabel .
    ?type rdfs:label ?typeLabel .
    ?affiliation rdfs:label ?affiliationLabel .
    ?member rdfs:label ?memberLabel .
    ?country rdfs:label ?countryLabel .
    ?subject rdfs:label ?subjectLabel .
  }
  OPTIONAL { ?project schema:description ?description .
             FILTER(LANG(?description) IN ("en", "fr")) }
  OPTIONAL { ?project wdt:P31 ?type . }
  OPTIONAL { ?project wdt:P1416 ?affiliation . }
  OPTIONAL { ?project wdt:P580 ?startDate . }
  OPTIONAL { ?project wdt:P582 ?endDate . }
  OPTIONAL { ?project wdt:P571 ?inception . }
  OPTIONAL { ?project wdt:P576 ?dissolved . }
  OPTIONAL { ?project wdt:P625 ?directCoords . }
  OPTIONAL { ?project wdt:P276 ?city .
             ?city wdt:P625 ?cityCoords . }
  OPTIONAL { ?project wdt:P17 ?country .
             ?country wdt:P625 ?countryCoords . }
  OPTIONAL { ?project wdt:P856 ?link . }
  OPTIONAL { ?project wdt:P921 ?subject . }
  OPTIONAL { ?project wdt:P50 ?member . }
}
GROUP BY ?project ?projectLabel ?description
LIMIT 100
`.trim();

const WIKIDATA_ENDPOINT = import.meta.env.DEV
    ? `/sparql?format=json&query=${encodeURIComponent(SPARQL_QUERY)}`
    : `https://query.wikidata.org/sparql?format=json&origin=*&query=${encodeURIComponent(SPARQL_QUERY)}`;

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

	const currentYear = new Date().getFullYear();

	const calcDuration = (startYear: number | undefined, endYear: number | undefined, ongoing: boolean): string => {
		if (!startYear) return '';
		const end = ongoing ? currentYear : (endYear ?? currentYear);
		const years = end - startYear;
		if (years === 0) return '< 1 year';
		return `${years} year${years > 1 ? 's' : ''}`;
	};

	const loadProjects = async () => {
		loading = true;
		error = '';
		try {
			const res = await fetch(WIKIDATA_ENDPOINT, {
				headers: { Accept: 'application/sparql-results+json' }
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			const bindings = data.results.bindings as Record<string, { value: string }>[];

			const seen = new Set<string>();
projects = bindings.flatMap((b) => {
    const qid = extractQid(b.project?.value ?? '');
    if (seen.has(qid)) return [];
    seen.add(qid);
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
    const startYear = parseYear(raw.start);
    const endYear = parseYear(raw.end);
    const ongoing = !endYear;
    return [{
        ...raw,
        qid,
        lat: coords?.lat,
        lng: coords?.lng,
        startYear,
        endYear,
        ongoing,
        duration: calcDuration(startYear, endYear, ongoing)
    }];
});
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
		} finally {
			loading = false;
		}
	};

	$effect(() => { loadProjects(); });

	type View = 'table' | 'map' | 'timeline';
	let activeView = $state<View>('table');

	let searchQuery = $state('');
	let filterCountry = $state('');

	const allCountries = $derived(
		Array.from(new Set(projects.map((p) => p.country).filter(Boolean))).sort() as string[]
	);

	const filtered = $derived(
		projects.filter((p) => {
			const q = searchQuery.trim().toLowerCase();
			const matchSearch =
				!q ||
				p.projectLabel.toLowerCase().includes(q) ||
				(p.description ?? '').toLowerCase().includes(q) ||
				(p.affiliation ?? '').toLowerCase().includes(q) ||
				(p.country ?? '').toLowerCase().includes(q) ||
				(p.subjects ?? '').toLowerCase().includes(q);
			const matchCountry = !filterCountry || p.country === filterCountry;
			return matchSearch && matchCountry;
		})
	);

	const timelineProjects = $derived(
		projects.filter((p) => p.startYear).sort((a, b) => (a.startYear ?? 0) - (b.startYear ?? 0))
	);

	const minYear = $derived(
		timelineProjects.length > 0 ? Math.min(...timelineProjects.map((p) => p.startYear!)) : currentYear - 5
	);
	const maxYear = $derived(
		Math.max(...timelineProjects.map((p) => p.endYear ?? currentYear), currentYear)
	);
	const yearRange = $derived(maxYear - minYear || 1);

	const barLeft = (startYear: number) => ((startYear - minYear) / yearRange) * 100;
	const barWidth = (startYear: number, endYear: number | undefined, ongoing: boolean) => {
		const end = ongoing ? currentYear : (endYear ?? currentYear);
		return Math.max(((end - startYear) / yearRange) * 100, 1);
	};

	let mapContainer = $state<HTMLDivElement | null>(null);
	let mapInitialized = $state(false);

	$effect(() => {
		if (activeView === 'map' && mapContainer && !mapInitialized && !loading) {
			mapInitialized = true;
			initMap();
		}
	});

	const initMap = async () => {
		if (typeof window === 'undefined') return;
		if (!(window as any).L) {
			await new Promise<void>((resolve, reject) => {
				const script = document.createElement('script');
				script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
				script.onload = () => resolve();
				script.onerror = () => reject(new Error('Leaflet failed to load'));
				document.head.appendChild(script);
			});
		}
		const L = (window as any).L;
		const map = L.map(mapContainer).setView([20, 0], 2);
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '© OpenStreetMap contributors'
		}).addTo(map);

		const mapProjects = projects.filter((p) => p.lat && p.lng);
		if (mapProjects.length === 0) return;

		mapProjects.forEach((p) => {
			const popup = [
				`<strong>${p.projectLabel}</strong>`,
				p.description ? `<em style="font-size:0.85em">${p.description}</em>` : '',
				p.country ? `📍 ${p.country}` : '',
				p.affiliation ? `🏛 ${p.affiliation}` : '',
				p.startYear ? `📅 ${p.startYear}${p.ongoing ? ' – ongoing' : p.endYear ? ` – ${p.endYear}` : ''} (${p.duration})` : '',
				`<a href="https://www.wikidata.org/wiki/${p.qid}" target="_blank" rel="noopener">Wikidata →</a>`
			].filter(Boolean).join('<br/>');
			L.marker([p.lat!, p.lng!]).bindPopup(popup).addTo(map);
		});

		
		const bounds = L.latLngBounds(mapProjects.map((p) => [p.lat!, p.lng!]));
		map.fitBounds(bounds, { padding: [40, 40] });
	};
</script>

<svelte:head>
	<title>Mapping | {config.siteTitle}</title>
	<meta name="description" content="Exhibition and performance documentation projects referenced in Wikidata." />
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</svelte:head>

<div class="map-layout">
	<div class="map-header">
		<h1>Project Mapping</h1>
		<p class="map-subtitle">
			Exhibition and performance documentation projects referenced in Wikidata.
		</p>
	</div>

	{#if loading}
		<div class="map-loading">
			<span class="map-spinner"></span>
			Loading Wikidata…
		</div>
	{:else if error}
		<div class="map-error">
			⚠️ Error: {error}
			<button onclick={loadProjects}>Retry</button>
		</div>
	{:else}
		<div class="map-stats">
			<span>{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
			{#if projects.filter(p => p.lat).length > 0}
				<span>· {projects.filter(p => p.lat).length} geolocated</span>
			{/if}
			{#if timelineProjects.length > 0}
				<span>· {timelineProjects.length} dated</span>
			{/if}
		</div>

		<div class="map-tabs" role="tablist">
			{#each (['table', 'map', 'timeline'] as View[]) as view}
				<button
					role="tab"
					aria-selected={activeView === view}
					class="map-tab"
					class:active={activeView === view}
					onclick={() => (activeView = view)}
				>
					{{ table: 'Table', map: 'Map', timeline: 'Timeline' }[view]}
				</button>
			{/each}
		</div>

		{#if activeView === 'table'}
			<div class="map-toolbar">
				<div class="map-search-wrap">
					<span aria-hidden="true">🔍</span>
					<input
						type="search"
						class="map-search"
						placeholder="Search projects, countries, institutions, subjects…"
						bind:value={searchQuery}
						aria-label="Recherche"
					/>
				</div>
				{#if allCountries.length > 1}
					<select class="map-select" bind:value={filterCountry} aria-label="Filter by country">
						<option value="">All countries</option>
						{#each allCountries as country}
							<option value={country}>{country}</option>
						{/each}
					</select>
				{/if}
				<span class="map-count">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
			</div>

			{#if filtered.length === 0}
				<div class="map-empty">
					<p>No projects match these criteria.</p>
					<button onclick={() => { searchQuery = ''; filterCountry = ''; }}>Reset</button>
				</div>
			{:else}
				<div class="map-table-wrap">
					<table class="map-table">
						<thead>
							<tr>
								<th>Project</th>
								<th>Description</th>
								<th>Country</th>
								<th>Institution</th>
								<th>Period</th>
								<th>Subjects</th>
								<th>↗</th>
							</tr>
						</thead>
						<tbody>
							{#each filtered as p (p.qid)}
								<tr>
									<td class="map-td-title">
										<a href="https://www.wikidata.org/wiki/{p.qid}" target="_blank" rel="noopener noreferrer">
											{p.projectLabel || p.qid}
										</a>
									</td>
									<td class="map-td-desc">{p.description ?? '—'}</td>
									<td>{p.country || '—'}</td>
									<td>{p.affiliation || '—'}</td>
									<td class="map-td-period">
										{#if p.startYear}
											{p.startYear}{p.ongoing ? ' – ongoing' : p.endYear ? ` – ${p.endYear}` : ''}
											{#if p.duration}<span class="map-duration">({p.duration})</span>{/if}
										{:else}
											—
										{/if}
									</td>
									<td class="map-td-subjects">
										{#if p.subjects}
											{#each p.subjects.split(', ').filter(s => s.trim()) as subject}
												<span class="map-subject-chip">{subject}</span>
											{/each}
										{:else}—{/if}
									</td>
									<td>
										{#if p.links}
											<a href={p.links.split(', ')[0]} target="_blank" rel="noopener noreferrer">↗</a>
										{:else}—{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

		{:else if activeView === 'map'}
			{#if projects.filter(p => p.lat).length === 0}
				<div class="map-empty">
					<p>No geolocated projects yet.</p>
					<p>Add coordinates (P625) or a country (P17) to Wikidata entries.</p>
					<a href="https://www.wikidata.org" target="_blank" rel="noopener">Contribute on Wikidata →</a>
				</div>
			{:else}
				<div class="map-leaflet" bind:this={mapContainer}></div>
			{/if}

		{:else if activeView === 'timeline'}
			{#if timelineProjects.length === 0}
				<div class="map-empty">
					<p>No dated projects yet.</p>
					<p>Add a start date (P571) to Wikidata entries.</p>
					<a href="https://www.wikidata.org" target="_blank" rel="noopener">Contribute on Wikidata →</a>
				</div>
			{:else}
				<div class="timeline">
					<div class="timeline-year-labels">
						{#each Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i).filter(y => (y - minYear) % Math.max(1, Math.floor(yearRange / 8)) === 0) as year}
							<span class="timeline-year-label" style="left: {((year - minYear) / yearRange) * 100}%">{year}</span>
						{/each}
					</div>
					<div class="timeline-grid">
						{#each timelineProjects as p, i (p.qid)}
							<div class="timeline-row">
								<div class="timeline-row-label">
									<a href="https://www.wikidata.org/wiki/{p.qid}" target="_blank" rel="noopener noreferrer">
										{p.projectLabel}
									</a>
									{#if p.country}<span class="timeline-row-country">{p.country}</span>{/if}
								</div>
								<div class="timeline-row-bar-wrap">
									<div
										class="timeline-bar"
										class:ongoing={p.ongoing}
										style="left: {barLeft(p.startYear!)}%; width: {barWidth(p.startYear!, p.endYear, p.ongoing)}%"
										title="{p.startYear}{p.ongoing ? ' – ongoing' : p.endYear ? ` – ${p.endYear}` : ''} · {p.duration}"
									>
										<span class="timeline-bar-label">
											{p.startYear}{p.ongoing ? ' – ongoing' : p.endYear ? ` – ${p.endYear}` : ''}
											{#if p.duration}&nbsp;({p.duration}){/if}
										</span>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/if}

		<footer class="map-footer">
			<a href="https://icom-doc-ep-wg.github.io/blog/blog/2026-06-23#how-to-add-your-reasearch-project-to-wikidata--a-step-by-step-guide" target="_blank" rel="noopener noreferrer">
				How to add your research project to Wikidata: a step-by-step guide →
			</a>
			<span>·</span>
			Data from <a href="https://www.wikidata.org" target="_blank" rel="noopener">Wikidata</a>
			under <a href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank" rel="noopener">CC0</a>.
		</footer>
	{/if}
</div>

<style>
	.map-layout { padding-bottom: 3rem; }
	.map-header { margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid var(--color-link, #1a3f7a); }
	.map-header h1 { margin: 0 0 0.4rem; }
	.map-subtitle { margin: 0; font-size: 0.9rem; color: var(--color-text-secondary, #666); }
	.map-stats { font-size: 0.85rem; color: var(--color-text-secondary, #888); margin-bottom: 1rem; display: flex; gap: 0.25rem; flex-wrap: wrap; }
	.map-tabs { display: flex; border-bottom: 2px solid var(--color-bg-secondary, #e0e0e0); margin-bottom: 1.25rem; }
	.map-tab { padding: 0.5rem 1.25rem; border: none; border-bottom: 2px solid transparent; margin-bottom: -2px; background: none; cursor: pointer; font-size: 0.9rem; color: var(--color-text-secondary, #777); font-weight: 500; }
	.map-tab:hover { color: var(--color-link, #1a3f7a); }
	.map-tab.active { color: var(--color-link, #1a3f7a); border-bottom-color: var(--color-link, #1a3f7a); font-weight: 600; }
	.map-toolbar { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; margin-bottom: 1rem; }
	.map-search-wrap { display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 200px; }
	.map-search { flex: 1; padding: 0.45rem 0.75rem; border: 1px solid var(--color-bg-secondary, #ccc); border-radius: 4px; font-size: 0.9rem; }
	.map-select { padding: 0.45rem 0.65rem; border: 1px solid var(--color-bg-secondary, #ccc); border-radius: 4px; font-size: 0.875rem; }
	.map-count { font-size: 0.82rem; color: var(--color-text-secondary, #888); white-space: nowrap; }
	.map-table-wrap { overflow-x: auto; }
	.map-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; display: table; white-space: normal; }
	.map-table th { text-align: left; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-secondary, #888); padding: 0.5rem 0.75rem; border-bottom: 2px solid var(--color-bg-secondary, #e0e0e0); background: none; }
	.map-table td { padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--color-bg-secondary, #f0f0f0); vertical-align: top; }
	.map-table tr:hover td { background: var(--color-accent, #f5f7fc); }
	.map-td-title { font-weight: 600; min-width: 150px; }
	.map-td-desc { color: var(--color-text-secondary, #666); font-size: 0.82rem; max-width: 260px; }
	.map-td-period { white-space: nowrap; font-size: 0.82rem; }
	.map-duration { color: var(--color-text-secondary, #999); font-size: 0.75rem; }
	.map-td-subjects { display: flex; flex-wrap: wrap; gap: 0.25rem; min-width: 120px; }
	.map-subject-chip { display: inline-block; font-size: 0.7rem; padding: 0.15rem 0.45rem; border-radius: 999px; background: var(--color-accent, #e8eef8); color: var(--color-link, #1a3f7a); }
	.map-leaflet { height: 500px; width: 100%; border-radius: 6px; border: 1px solid var(--color-bg-secondary, #e0e0e0); }
	.timeline { margin: 1rem 0; }
	.timeline-year-labels { position: relative; height: 1.5rem; margin-bottom: 0.5rem; margin-left: 220px; }
	.timeline-year-label { position: absolute; transform: translateX(-50%); font-size: 0.72rem; color: var(--color-text-secondary, #999); }
	.timeline-grid { display: flex; flex-direction: column; gap: 0.5rem; }
	.timeline-row { display: flex; align-items: center; gap: 0.75rem; min-height: 2rem; }
	.timeline-row-label { width: 220px; flex-shrink: 0; font-size: 0.82rem; text-align: right; padding-right: 0.5rem; display: flex; flex-direction: column; align-items: flex-end; gap: 0.1rem; }
	.timeline-row-label a { font-weight: 600; color: var(--color-text, #222); text-decoration: none; font-size: 0.82rem; }
	.timeline-row-label a:hover { color: var(--color-link, #1a3f7a); text-decoration: underline; }
	.timeline-row-country { font-size: 0.7rem; color: var(--color-text-secondary, #999); }
	.timeline-row-bar-wrap { flex: 1; position: relative; height: 24px; background: var(--color-bg-secondary, #f0f2f5); border-radius: 3px; }
	.timeline-bar { position: absolute; height: 100%; background: var(--color-link, #1a3f7a); border-radius: 3px; display: flex; align-items: center; padding: 0 0.5rem; min-width: 4px; overflow: hidden; opacity: 0.85; }
	.timeline-bar.ongoing { background: var(--color-secondary, #7b2fa0); border-radius: 3px 0 0 3px; }
	.timeline-bar-label { font-size: 0.68rem; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.map-loading { display: flex; align-items: center; gap: 0.75rem; padding: 3rem 0; color: var(--color-text-secondary, #888); font-size: 0.9rem; }
	.map-spinner { display: inline-block; width: 18px; height: 18px; border: 2px solid var(--color-bg-secondary, #ccc); border-top-color: var(--color-link, #1a3f7a); border-radius: 50%; animation: spin 0.8s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }
	.map-error { padding: 1rem; border-left: 3px solid #c0392b; color: #c0392b; background: #fdf0ee; display: flex; align-items: center; gap: 1rem; }
	.map-empty { padding: 3rem 0; text-align: center; color: var(--color-text-secondary, #888); font-size: 0.9rem; }
	.map-empty p { margin: 0.3rem 0; }
	.map-footer { margin-top: 2.5rem; padding-top: 1rem; border-top: 1px solid var(--color-bg-secondary, #e0e0e0); font-size: 0.8rem; color: var(--color-text-secondary, #999); display: flex; gap: 0.5rem; flex-wrap: wrap; }
	@media (max-width: 600px) {
		.map-table th:nth-child(n+4), .map-table td:nth-child(n+4) { display: none; }
		.timeline-row-label { width: 100px; font-size: 0.72rem; }
	}
</style>