import type { MetadataInput } from './metadata.js';
import type { SitemapEntry } from '../types.js';

export type SchemaPageType =
  | 'WebPage'
  | 'AboutPage'
  | 'CollectionPage'
  | 'ContactPage'
  | 'FAQPage'
  | 'ProfilePage'
  | 'TechArticle';

export interface PublicRouteDefinition {
  path: string;
  title: string;
  description: string;
  navLabel: string;
  aliases?: readonly string[];
  schemaType?: SchemaPageType;
  showInNavigation?: boolean;
  changefreq?: SitemapEntry['changefreq'];
  priority?: number;
  ogImage?: string;
  ogType?: string;
  robots?: string;
}

export interface ResolvedPublicRoute {
  route: PublicRouteDefinition;
  requestedPath: string;
  canonicalPath: string;
  isAlias: boolean;
}

export interface RouteManifest {
  readonly routes: readonly PublicRouteDefinition[];
  resolve(pathname: string): ResolvedPublicRoute | undefined;
  canonicalPath(pathname: string): string;
  navigation(): Array<{ href: string; label: string }>;
  sitemap(baseUrl: string): SitemapEntry[];
  robotsAllowPaths(): string[];
  breadcrumbs(pathname: string, baseUrl: string): Array<{ name: string; url: string }>;
  metadata(pathname: string): MetadataInput | undefined;
}

function normalizePath(path: string): string {
  const value = path.trim();
  if (!value || value === '/') return '/';
  const prefixed = value.startsWith('/') ? value : `/${value}`;
  return prefixed.replace(/\/+$/, '');
}

function absoluteUrl(baseUrl: string, path: string): string {
  return new URL(normalizePath(path), `${baseUrl.replace(/\/+$/, '')}/`).toString();
}

export function defineRouteManifest(definitions: readonly PublicRouteDefinition[]): RouteManifest {
  const routes = definitions.map((definition) => ({
    ...definition,
    path: normalizePath(definition.path),
    aliases: definition.aliases?.map(normalizePath) ?? [],
  }));

  const claimed = new Map<string, string>();
  for (const route of routes) {
    if (!route.title.trim()) throw new Error(`Route ${route.path} requires a title`);
    if (!route.description.trim()) throw new Error(`Route ${route.path} requires a description`);
    if (route.priority !== undefined && (route.priority < 0 || route.priority > 1)) {
      throw new Error(`Route ${route.path} priority must be between 0 and 1`);
    }
    for (const path of [route.path, ...route.aliases]) {
      const owner = claimed.get(path);
      if (owner) throw new Error(`Route path ${path} is claimed by both ${owner} and ${route.path}`);
      claimed.set(path, route.path);
    }
  }

  const resolve = (pathname: string): ResolvedPublicRoute | undefined => {
    const requestedPath = normalizePath(pathname);
    for (const route of routes) {
      if (route.path === requestedPath) {
        return { route, requestedPath, canonicalPath: route.path, isAlias: false };
      }
      if (route.aliases.includes(requestedPath)) {
        return { route, requestedPath, canonicalPath: route.path, isAlias: true };
      }
      if (route.path !== '/' && requestedPath.startsWith(`${route.path}/`)) {
        return { route, requestedPath, canonicalPath: requestedPath, isAlias: false };
      }
      const alias = route.aliases.find((candidate) => requestedPath.startsWith(`${candidate}/`));
      if (alias) {
        return {
          route,
          requestedPath,
          canonicalPath: `${route.path}${requestedPath.slice(alias.length)}`,
          isAlias: true,
        };
      }
    }
    return undefined;
  };

  return {
    routes,
    resolve,
    canonicalPath(pathname) {
      return resolve(pathname)?.canonicalPath ?? normalizePath(pathname);
    },
    navigation() {
      return routes
        .filter((route) => route.showInNavigation !== false)
        .map((route) => ({ href: route.path, label: route.navLabel }));
    },
    sitemap(baseUrl) {
      return routes.map((route) => ({
        loc: absoluteUrl(baseUrl, route.path),
        changefreq: route.changefreq,
        priority: route.priority,
      }));
    },
    robotsAllowPaths() {
      return routes.map((route) => route.path);
    },
    breadcrumbs(pathname, baseUrl) {
      const resolved = resolve(pathname);
      if (!resolved || resolved.canonicalPath === '/') return [];
      const root = routes.find((route) => route.path === '/');
      return [
        { name: root?.navLabel || 'Home', url: absoluteUrl(baseUrl, '/') },
        { name: resolved.route.navLabel, url: absoluteUrl(baseUrl, resolved.canonicalPath) },
      ];
    },
    metadata(pathname) {
      const resolved = resolve(pathname);
      if (!resolved) return undefined;
      return {
        title: resolved.route.title,
        description: resolved.route.description,
        path: resolved.canonicalPath,
        ogImage: resolved.route.ogImage,
        ogType: resolved.route.ogType,
        robots: resolved.route.robots,
      };
    },
  };
}
