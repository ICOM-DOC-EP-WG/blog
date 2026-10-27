<script lang="ts">
	import { resolve } from '$app/paths';
	import * as config from '$lib/config';

	type FooterRoute =
		| '/'
		| '/blog'
		| '/projects'
		| '/membres'
		| '/mapping'
		| '/publications'
		| '/a-propos'
		| '/rss.xml';

	const visibleItems = config.navItems.filter((item) => !item.hidden);
	const withBase = (route: FooterRoute) => resolve(route);
</script>

<footer>
	<hr />
	<div class="footer-content">
		<div class="footer-info">
			<p><strong>{config.siteTitle}</strong></p>
			<p><small>{config.siteDescription}</small></p>
			<p><small>Contact: {config.contactInfo}</small></p>
		</div>

		<nav aria-label="Résumé de navigation">
			<p><small>Navigation</small></p>
			<ul>
				<li class="resource-links">
					<span>Resources</span>
					<a href={withBase('/mapping')}>Mapping</a>
					<a href={withBase('/publications')}>Bibliography</a>
				</li>
				{#each visibleItems as item (item.route)}
					<li><a href={withBase(item.route as FooterRoute)}>{item.title}</a></li>
				{/each}
				<li><a href={withBase('/rss.xml')}>RSS</a></li>
			</ul>
		</nav>
	</div>
</footer>

<style>
	.footer-content {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
		gap: 2rem 3rem;
		align-items: start;
		justify-content: space-between;
	}

	.footer-info p {
		margin: 0.5rem 0;
	}

	nav {
		margin: 0;
	}

	nav > p {
		margin: 0 0 0.65rem;
		text-align: right;
	}

	nav ul {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.45rem 1rem;
		list-style: none;
		padding: 0;
		margin: 0;
	}

	nav a {
		font-weight: normal;
		font-size: 0.88rem;
		text-decoration-color: transparent;
		text-underline-offset: 0.15em;
	}

	nav a:hover,
	nav a:focus-visible {
		text-decoration-color: currentColor;
	}

	.resource-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 0.75rem;
		align-items: center;
		padding-right: 1rem;
		border-right: 1px solid var(--color-shadow);
	}

	.resource-links span {
		color: var(--color-text-secondary);
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
	}

	@media (max-width: 768px) {
		.footer-content {
			grid-template-columns: 1fr;
			gap: 1.25rem;
		}

		nav > p {
			text-align: left;
		}

		nav ul {
			justify-content: flex-start;
		}

		.resource-links {
			padding-right: 0.75rem;
		}
	}
</style>