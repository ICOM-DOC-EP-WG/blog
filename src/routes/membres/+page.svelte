<script lang="ts">
	import type { PageProps } from './$types';
	import * as config from '$lib/config';

	let { data }: PageProps = $props();
	let query = $state('');
	let sortOrder = $state<'contributions' | 'name'>('contributions');

	const totalContributions = $derived(
		data.members.reduce((total, member) => total + member.articles.length + member.projects.length, 0)
	);
	const countriesCount = $derived(new Set(data.members.map((member) => member.country).filter(Boolean)).size);
	const filteredMembers = $derived.by(() => {
		const search = query.trim().toLocaleLowerCase('en');
		const matching = data.members.filter((member) =>
			[member.name, member.affiliation, member.city, member.country]
				.filter(Boolean)
				.some((value) => value!.toLocaleLowerCase('en').includes(search))
		);

		return matching.toSorted((left, right) => {
			if (sortOrder === 'name') return left.name.localeCompare(right.name, 'en');

			const rightCount = right.articles.length + right.projects.length;
			const leftCount = left.articles.length + left.projects.length;
			return rightCount - leftCount || left.name.localeCompare(right.name, 'en');
		});
	});
</script>

<svelte:head>
	<title>Members | {config.siteTitle}</title>
	<meta
		name="description"
		content="Members, blog articles and projects of the Exhibition and Performance Documentation Working Group."
	/>
</svelte:head>

<div class="pageIntro">
	<p class="eyebrow">ICOM Working Group</p>
	<h1>Members</h1>
	<p>People behind the group's work, publications, and projects.</p>
</div>

{#if data.members.length > 0}
	<section class="directory" aria-label="Member directory">
		<div class="directoryStats" aria-label="Directory overview">
			<p><strong>{data.members.length}</strong><span>members</span></p>
			<p><strong>{countriesCount}</strong><span>countries</span></p>
			<p><strong>{totalContributions}</strong><span>contributions</span></p>
		</div>

		<div class="directoryControls">
			<label class="searchField">
				<span>Search members</span>
				<input
					bind:value={query}
					type="search"
					placeholder="Name, institution, city or country"
				/>
			</label>
			<label class="sortField">
				<span>Sort by</span>
				<select bind:value={sortOrder}>
					<option value="contributions">Most contributions</option>
					<option value="name">Name (A–Z)</option>
				</select>
			</label>
		</div>

		<p class="resultCount" aria-live="polite">
			Showing {filteredMembers.length} of {data.members.length} members
		</p>

		{#if filteredMembers.length > 0}
			<ul class="memberList">
				{#each filteredMembers as member (member.id)}
					<li class="memberRow" id={member.id}>
						<div class="memberIdentity">
							<h2>{member.name}</h2>
							{#if member.affiliation}<p class="affiliation">{member.affiliation}</p>{/if}
							{#if member.city || member.country}
								<p class="location">{[member.city, member.country].filter(Boolean).join(', ')}</p>
							{/if}
						</div>
						{#if member.articles.length + member.projects.length > 0}
						<details class="contributions">
							<summary>
								<span class="contributionCount">{member.articles.length + member.projects.length}</span>
								<span class="contributionLabel">
									{member.articles.length + member.projects.length === 1 ? 'contribution' : 'contributions'}
								</span>
								<span class="disclosureLabel">View</span>
							</summary>
							<div class="contributionDetails">
								{#if member.articles.length > 0}
									<div class="workGroup">
										<h3>Blog articles</h3>
										<ul>
											{#each member.articles as article (article.slug)}
												<li><a href={article.href}>{article.title}</a></li>
											{/each}
										</ul>
									</div>
								{/if}
								{#if member.projects.length > 0}
									<div class="workGroup">
										<h3>Projects</h3>
										<ul>
											{#each member.projects as project (project.slug)}
												<li><a href={project.href}>{project.title}</a></li>
											{/each}
										</ul>
									</div>
								{/if}
							</div>
						</details>
						{:else}
							<p class="noContributions">No published contributions yet.</p>
						{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<div class="emptyState">
				<p>No members match “{query}”.</p>
				<button type="button" onclick={() => (query = '')}>Clear search</button>
			</div>
		{/if}
	</section>
{:else}
	<p class="emptyState">No members are listed yet.</p>
{/if}

<style>
	.pageIntro {
		padding: 2rem 0 1.75rem;
		border-bottom: 1px solid var(--color-shadow);
		margin-bottom: 1.5rem;
	}

	.eyebrow {
		margin: 0 0 0.6rem;
		color: var(--color-secondary);
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
	}

	h1 {
		margin: 0;
		font-size: clamp(2rem, 5vw, 3.25rem);
	}

	.pageIntro > p:last-child {
		max-width: 42rem;
		margin: 0.75rem 0 0;
		color: var(--color-text-secondary);
	}

	.directory {
		display: block;
	}

	.directoryStats {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem 2.5rem;
		padding: 1rem 0;
		border-bottom: 1px solid var(--color-shadow);
	}

	.directoryStats p {
		display: flex;
		align-items: baseline;
		gap: 0.45rem;
		margin: 0;
	}

	.directoryStats strong {
		color: var(--color-link);
		font-size: 1.2rem;
	}

	.directoryStats span,
	.resultCount {
		color: var(--color-text-secondary);
		font-size: 0.85rem;
	}

	.directoryControls {
		display: grid;
		grid-template-columns: minmax(14rem, 1fr) minmax(12rem, 0.35fr);
		gap: 1rem;
		align-items: end;
		padding: 1.25rem 0 0.75rem;
	}

	.directoryControls label {
		display: grid;
		gap: 0.35rem;
		color: var(--color-text-secondary);
		font-size: 0.8rem;
		font-weight: 600;
	}

	.directoryControls input,
	.directoryControls select {
		box-sizing: border-box;
		width: 100%;
		min-height: 2.75rem;
		margin: 0;
		padding: 0.55rem 0.7rem;
		border: 1px solid var(--color-shadow);
		border-radius: 4px;
		background: var(--color-bg);
		color: var(--color-text);
		font: inherit;
		font-size: 0.92rem;
	}

	.directoryControls input:focus-visible,
	.directoryControls select:focus-visible {
		border-color: var(--color-link);
		outline: 2px solid color-mix(in srgb, var(--color-link) 25%, transparent);
		outline-offset: 1px;
	}

	.resultCount {
		margin: 0;
		padding-bottom: 0.6rem;
	}

	.memberList {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.memberRow {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.6rem 1rem;
		align-items: center;
		padding: 1rem 0;
		border-bottom: 1px solid var(--color-shadow);
	}

	.memberIdentity h2 {
		margin: 0;
		font-size: 1.05rem;
		line-height: 1.35;
	}

	.affiliation,
	.location {
		margin: 0.2rem 0 0;
		color: var(--color-text-secondary);
		font-size: 0.85rem;
	}

	.location {
		font-size: 0.8rem;
	}

	.contributions {
		grid-column: 1 / -1;
		border-top: 1px solid var(--color-bg-secondary);
	}

	.contributions summary {
		display: flex;
		width: fit-content;
		min-height: 2.25rem;
		align-items: center;
		gap: 0.45rem;
		margin-left: auto;
		color: var(--color-text-secondary);
		cursor: pointer;
		font-size: 0.82rem;
		list-style: none;
	}

	.contributions summary::-webkit-details-marker {
		display: none;
	}

	.contributions summary::after {
		width: 0.4rem;
		height: 0.4rem;
		border-right: 1.5px solid currentColor;
		border-bottom: 1.5px solid currentColor;
		content: '';
		transform: rotate(45deg) translateY(-0.1rem);
		transition: transform 150ms ease;
	}

	.contributions[open] summary::after {
		transform: rotate(225deg) translate(-0.1rem, -0.1rem);
	}

	.contributionCount {
		color: var(--color-text);
		font-weight: 700;
	}

	.contributionDetails {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
		gap: 1rem 2rem;
		padding: 0.5rem 0 0.25rem;
	}

	.workGroup h3 {
		margin: 0 0 0.35rem;
		color: var(--color-text-secondary);
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
	}

	.workGroup ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.workGroup li + li {
		margin-top: 0.25rem;
	}

	.workGroup a {
		color: var(--color-text-secondary);
		font-size: 0.88rem;
		text-decoration: none;
		text-underline-offset: 0.15em;
	}

	.workGroup a:hover,
	.workGroup a:focus-visible {
		color: var(--color-link);
		text-decoration: underline;
	}

	.noContributions {
		grid-column: 1 / -1;
		margin: 0;
		color: var(--color-text-secondary);
		font-size: 0.85rem;
	}

	.emptyState {
		padding: 2rem 0;
		color: var(--color-text-secondary);
		text-align: center;
	}

	.emptyState p {
		margin: 0 0 0.75rem;
	}

	.emptyState button {
		margin: 0;
		padding: 0;
		border: 0;
		background: none;
		color: var(--color-link);
		cursor: pointer;
		font: inherit;
		font-weight: 600;
		text-decoration: underline;
	}

	@media (max-width: 600px) {
		.directoryControls {
			grid-template-columns: 1fr;
			gap: 0.75rem;
		}

		.directoryStats {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 0.5rem;
		}

		.directoryStats p {
			align-items: flex-start;
			flex-direction: column;
			gap: 0;
		}

		.directoryStats strong {
			font-size: 1.05rem;
		}

		.directoryStats span {
			font-size: 0.72rem;
		}

		.memberRow {
			padding: 0.85rem 0;
		}

		.contributions summary {
			min-height: 2.5rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.contributions summary::after {
			transition: none;
		}
	}
</style>