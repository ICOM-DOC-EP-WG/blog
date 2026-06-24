<script lang="ts">
	import * as config from '$lib/config';
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>{config.siteTitle}</title>
	<meta name="description" content={config.siteDescription} />
</svelte:head>

<div class="home">
	<div class="home-hero">
		<p class="home-eyebrow">ICOM Working Group</p>
		<h1>Exhibition and Performance Documentation</h1>
		<p class="home-intro">
			A working group of the <a href="https://icom-documentation.mini.icom.museum/working-groups/exhibition-and-performance-documentation/" target="_blank" rel="noopener noreferrer">ICOM International Committee for Documentation</a> dedicated to the documentation of exhibitions, performances, and time-based art.
		</p>
		<div class="home-actions">
			<a href={resolve('/blog')}>Blog</a>
			<a href={resolve('/publications')}>Bibliography</a>
			<a href={resolve('/projects')}>Projects</a>
		</div>
	</div>

	<div class="home-sections">
		<div class="home-section">
			<h2>About the group</h2>
			<p>
				The EPD Working Group brings together museum professionals, conservators, and researchers working on documentation practices for variable, ephemeral, and time-based artworks and exhibitions.
			</p>
			<a href={resolve('/a-propos')}>Learn more →</a>
		</div>
		<div class="home-section">
			<h2>Bibliography</h2>
			<p>
				A shared Zotero bibliography of key references on exhibition documentation, performance documentation, and related topics in conservation and museum studies.
			</p>
			<a href={resolve('/publications')}>Browse bibliography →</a>
		</div>
		<div class="home-section">
			<h2>Contact</h2>
			<p>
				Questions or contributions? Reach us at <a href="mailto:{config.contactInfo}">{config.contactInfo}</a>.
			</p>
		</div>
	</div>
</div>

<style>
	.home {
		max-width: 860px;
	}

	/* Hero */
	.home-hero {
		padding: 2rem 0 3rem;
		border-bottom: 2px solid var(--color-link, #1a3f7a);
		margin-bottom: 2.5rem;
	}

	.home-eyebrow {
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-secondary, #7b2fa0);
		font-weight: 600;
		margin: 0 0 0.75rem;
	}

	.home-hero h1 {
		font-size: clamp(1.6rem, 4vw, 2.4rem);
		line-height: 1.2;
		margin: 0 0 1rem;
		color: var(--color-link, #1a3f7a);
	}

	.home-intro {
		font-size: 1.05rem;
		color: var(--color-text-secondary, #555);
		max-width: 640px;
		margin: 0 0 1.5rem;
	}

	.home-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.home-actions a {
		padding: 0.5rem 1.25rem;
		border: 2px solid var(--color-link, #1a3f7a);
		border-radius: 4px;
		text-decoration: none;
		font-weight: 600;
		font-size: 0.9rem;
		color: var(--color-link, #1a3f7a);
		display: inline-block;
	}

	.home-actions a:hover {
		background: var(--color-link, #1a3f7a);
		color: #fff;
	}

	/* Sections */
	.home-sections {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 2rem;
	}

	.home-section h2 {
		font-size: 1rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-link, #1a3f7a);
		margin: 0 0 0.6rem;
		padding-bottom: 0.4rem;
		border-bottom: 1px solid var(--color-bg-secondary, #e0e0e0);
	}

	.home-section p {
		font-size: 0.9rem;
		color: var(--color-text-secondary, #555);
		margin: 0 0 0.75rem;
	}

	.home-section a {
		font-size: 0.875rem;
		font-weight: 600;
	}
</style>