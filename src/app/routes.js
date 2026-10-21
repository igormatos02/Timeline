import { useCallback, useEffect, useState } from 'react';
import { productByPath } from '../../shared/config/products.js';

// Pages inside a product besides its hub and its timeboards
export const ProductPage = Object.freeze({
  PLANS: 'plans'
});

// URL segment of each product page (accepts the English name too)
const PAGE_SEGMENTS = Object.freeze({
  [ProductPage.PLANS]: ['planos', 'plans']
});

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * App routes: / (platform: the products), /<product> (its hub), /<product>/<timeboardId> (a timeboard) and
 * /<product>/planos (its plans).
 */
export function parseRoute(pathname = window.location.pathname) {
  const [productSegment, second] = String(pathname || '').split('/').filter(Boolean);
  const product = productByPath(productSegment);
  if (!product) return { product: null, timeboardId: null, page: null };
  const page = Object.keys(PAGE_SEGMENTS).find((key) => PAGE_SEGMENTS[key].includes(second)) || null;
  const timeboardId = !page && UUID_PATTERN.test(String(second || '')) ? second : null;
  return { product, timeboardId, page };
}

export function buildPath({ product = null, timeboardId = null, page = null } = {}) {
  if (!product) return '/';
  if (page) return `/${product.path}/${PAGE_SEGMENTS[page][0]}`;
  if (timeboardId) return `/${product.path}/${timeboardId}`;
  return `/${product.path}`;
}

/** Current route and navigation (history API; the browser's back / forward update it). */
export function useAppRoute() {
  const [route, setRoute] = useState(() => parseRoute());

  useEffect(() => {
    const handlePopState = () => setRoute(parseRoute());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((target, { replace = false } = {}) => {
    const path = typeof target === 'string' ? target : buildPath(target);
    // Keeps the query (e.g. an invitation code) only when the path doesn't change
    const url = path === window.location.pathname ? `${path}${window.location.search}` : path;
    if (replace) window.history.replaceState({}, '', url);
    else if (path !== window.location.pathname) window.history.pushState({}, '', url);
    setRoute(parseRoute(path));
  }, []);

  return { route, navigate };
}
