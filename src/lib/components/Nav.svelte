<script lang="ts">
	import { asset, resolve } from '$app/paths';
	import { page } from '$app/state';
	import { navItems, siteTitle } from '$lib/config';

	type NavRoute = '/' | '/blog' | '/membres' | '/mapping' | '/publications' | '/tags' | '/a-propos';

	const visibleItems = navItems.filter((item) => !item.hidden);
	let pathname = $derived(page.url.pathname);
	const withBase = (route: NavRoute) => resolve(route);
	const normalizePath = (path: string) =>
		path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
	const isCurrentRoute = (route: NavRoute) => {
		const current = normalizePath(pathname);
		const target = normalizePath(withBase(route));

		return route === '/' ? current === target : current === target || current.startsWith(`${target}/`);
	};
</script>

<nav aria-label="Navigation principale">
	<a href={withBase('/')} aria-label="Accueil">
		<img src={asset('/images/logo.png')} alt={siteTitle} height="60" />
	</a>
	<ul>
		<li class="resourcesMenu">
			<details open={isCurrentRoute('/mapping') || isCurrentRoute('/publications')}>
				<summary
					class:active={isCurrentRoute('/mapping') || isCurrentRoute('/publications')}
					aria-label="Resources menu"
				>
					Resources
				</summary>
				<ul>
					<li>
						<a href={withBase('/mapping')} aria-current={isCurrentRoute('/mapping') ? 'page' : undefined}>
							Mapping
						</a>
					</li>
					<li>
						<a
							href={withBase('/publications')}
							aria-current={isCurrentRoute('/publications') ? 'page' : undefined}
						>
							Bibliography
						</a>
					</li>
				</ul>
			</details>
		</li>
		{#each visibleItems as item (item.route)}
			<li>
				<a
					href={withBase(item.route as NavRoute)}
					aria-current={isCurrentRoute(item.route as NavRoute) ? 'page' : undefined}
				>
					{item.title}
				</a>
			</li>
		{/each}
	</ul>
</nav>

<style>
	.resourcesMenu details {
		position: relative;
	}

	.resourcesMenu summary {
		cursor: pointer;
		list-style: none;
	}

	.resourcesMenu summary::-webkit-details-marker {
		display: none;
	}

	.resourcesMenu summary::after {
		content: '';
		display: inline-block;
		margin: 0 0 0.15rem 0.35rem;
		border: 0.28rem solid transparent;
		border-top-color: currentColor;
		transform: translateY(0.15rem);
	}

	.resourcesMenu summary.active {
		color: var(--color-secondary);
	}

	.resourcesMenu details > ul {
		top: calc(100% + 0.5rem);
		left: 0;
		z-index: 5;
		margin: 0;
	}

	.resourcesMenu details:not([open]) > ul {
		display: none;
	}

	.resourcesMenu details[open] > ul {
		display: block;
	}

	@media (max-width: 768px) {
		.resourcesMenu {
			width: calc(100% - 1em);
		}

		.resourcesMenu details[open] > ul {
			position: static;
			padding: 0.25rem 0 0 1rem;
			border: 0;
			box-shadow: none;
		}

		:global(nav > a:first-child) {
			max-width: 100%;
		}

		:global(nav > a:first-child img) {
			width: min(100%, 28rem);
			height: auto;
			max-height: 60px;
			object-fit: contain;
			object-position: left center;
		}
	}
</style>
