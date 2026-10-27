<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { navItems } from '$lib/config';

	interface BreadcrumbItem {
		title: string;
		href: string;
	}

	const root = resolve('/');
	const rootPrefix = root === '/' ? '' : root.slice(0, -1);

	const withBase = (path: string): string => `${root}${path.replace(/^\/+/, '')}`;

	const toAppPath = (pathname: string): string => {
		if (!rootPrefix || !pathname.startsWith(rootPrefix)) return pathname;

		const stripped = pathname.slice(rootPrefix.length);
		return stripped ? (stripped.startsWith('/') ? stripped : `/${stripped}`) : '/';
	};

	// Build breadcrumbs from the current URL
	const breadcrumbs = $derived.by(() => {
		const path = toAppPath(page.url.pathname);
		const items: BreadcrumbItem[] = [];

		// Always add "Home" first
		items.push({ title: 'Home', href: withBase('/') });

		// Stop at root
		if (path === '/') {
			return items;
		}

		// Split path into segments
		const segments = path.split('/').filter(Boolean);
		let currentPath = '';

		segments.forEach((segment, index) => {
			currentPath += `/${segment}`;
			const href = withBase(currentPath);

			// Resolve title from navItems
			const navItem = navItems.find((item) => item.route === currentPath);

			// Use page metadata title for the last segment
			if (index === segments.length - 1 && page.data?.metadata?.title) {
				items.push({
					title: page.data.metadata.title,
					href
				});
			} else {
				const title =
					navItem?.title ||
					segment
						.split('-')
						.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
						.join(' ');

				items.push({
					title,
					href
				});
			}
		});

		return items;
	});
</script>

{#if breadcrumbs.length > 1}
	<nav aria-label="Breadcrumb">
		<ol>
			{#each breadcrumbs as item, index (item.href)}
				<li aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}>
					{#if index === breadcrumbs.length - 1}
						<span>{item.title}</span>
					{:else}
						<a href={item.href}>{item.title}</a>
					{/if}
				</li>
			{/each}
		</ol>
	</nav>
{/if}

<style>
	nav {
		margin: 0 0 0.75rem;
		color: var(--color-secondary);
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
	}

	nav ol {
		display: flex;
		flex-wrap: wrap;
		list-style: none;
		padding: 0;
		margin: 0;
		gap: 0.5rem;
	}

	nav a,
	nav li:last-child {
		color: var(--color-secondary);
	}

	nav a {
		text-decoration: none;
	}

	nav a:hover,
	nav a:focus-visible {
		text-decoration: underline;
		text-underline-offset: 0.15em;
	}

	nav li:not(:last-child)::after {
		content: '›';
		margin-left: 0.5rem;
		color: var(--color-secondary);
	}
</style>
