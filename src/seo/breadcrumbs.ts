import type { BreadcrumbItem } from '../types.js';

export interface RouteDefinition {
  path: string;
  name: string;
  parent?: string;
  children?: RouteDefinition[];
}

export function buildBreadcrumbs(
  routes: RouteDefinition[],
  currentPath: string,
  baseUrl: string
): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [];

  const segments = currentPath.split('/').filter(Boolean);
  let accumulatedPath = '';

  for (let i = 0; i < segments.length; i++) {
    accumulatedPath += '/' + segments[i];

    const route = findRoute(routes, accumulatedPath);
    if (route) {
      breadcrumbs.push({
        name: route.name,
        url: `${baseUrl.replace(/\/$/, '')}${accumulatedPath}`,
      });
    } else {
      const name = segments[i]
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      breadcrumbs.push({
        name,
        url: `${baseUrl.replace(/\/$/, '')}${accumulatedPath}`,
      });
    }
  }

  return breadcrumbs;
}

function findRoute(routes: RouteDefinition[], targetPath: string): RouteDefinition | null {
  for (const route of routes) {
    const normalizedRoute = route.path.replace(/\/$/, '');
    const normalizedTarget = targetPath.replace(/\/$/, '');

    if (normalizedRoute === normalizedTarget) return route;

    if (route.children) {
      const child = findRoute(route.children, targetPath);
      if (child) return child;
    }
  }
  return null;
}

export function findParentRoutes(
  routes: RouteDefinition[],
  currentPath: string
): RouteDefinition[] {
  const parents: RouteDefinition[] = [];
  const segments = currentPath.split('/').filter(Boolean);

  for (let i = segments.length - 1; i >= 0; i--) {
    const parentPath = '/' + segments.slice(0, i).join('/');
    const route = findRoute(routes, parentPath);
    if (route) parents.unshift(route);
  }

  return parents;
}

export function getRouteDepth(routes: RouteDefinition[], path: string): number {
  return findParentRoutes(routes, path).length;
}
