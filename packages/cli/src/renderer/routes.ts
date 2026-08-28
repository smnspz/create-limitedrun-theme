// Explicit route table: URL path -> template + per-route assigns. Mirrors the
// routes the original limitedrun-themekit gem served, and additionally wires
// the templates it shipped but never served (events, event, gallery, history,
// search, maintenance, 404, order).

type Store = Record<string, any>;

/** Outcome of resolving a request path against the theme's routes. */
export interface RouteMatch {
  /** Template file name within `templates/`. */
  template: string;
  /** Render without the default layout (full-document templates). */
  bare?: boolean;
  /** Variables merged over the global scope. */
  assigns: Record<string, unknown>;
  /** HTTP status to respond with (default 200). */
  status?: number;
}

/**
 * Coerce a value to an array.
 *
 * @param v - any value
 * @returns `v` if it is an array, otherwise an empty array
 */
const asArray = (v: unknown): any[] => (Array.isArray(v) ? v : []);

/**
 * Find the item in a list whose `url` equals the given path.
 *
 * @param list - a value expected to be an array of `{ url }` objects
 * @param pathname - the request path to match
 * @returns the matching item, or `undefined`
 */
const byUrl = (list: unknown, pathname: string) => asArray(list).find((it) => it?.url === pathname);

interface Route {
  pattern: RegExp;
  resolve(m: RegExpMatchArray, store: Store, query: URLSearchParams): RouteMatch;
}

const routes: Route[] = [
  { pattern: /^\/$/, resolve: () => ({ template: 'index.html', assigns: {} }) },

  {
    pattern: /^\/news$/,
    resolve: (_m, store) => ({ template: 'news.html', assigns: { news: store.news } }),
  },
  {
    pattern: /^\/news\/posts\/[^/]+$/,
    resolve: (m, store) => {
      const items = asArray(store.news?.items);
      return {
        template: 'news-item.html',
        assigns: { item: byUrl(items, m[0]) ?? items[0], news: store.news },
      };
    },
  },

  {
    pattern: /^\/store$/,
    resolve: (_m, store) => ({
      template: 'category.html',
      assigns: {
        category: { ...(asArray(store.categories)[0] ?? {}), products: asArray(store.products) },
      },
    }),
  },
  {
    pattern: /^\/categories\/[^/]+$/,
    resolve: (m, store) => {
      const category = byUrl(store.categories, m[0]);
      if (!category) return { template: '404.html', assigns: {}, status: 404 };
      return {
        template: 'category.html',
        assigns: { category: { ...category, products: asArray(store.products) } },
      };
    },
  },

  {
    pattern: /^\/products\/[^/]+$/,
    resolve: (m, store) => {
      const product = byUrl(store.products, m[0]);
      if (!product) return { template: '404.html', assigns: {}, status: 404 };
      return { template: 'product.html', assigns: { product } };
    },
  },

  {
    pattern: /^\/artists$/,
    resolve: (_m, store) => ({ template: 'roster.html', assigns: { roster: store.roster } }),
  },
  {
    pattern: /^\/artists\/[^/]+(\/products)?$/,
    resolve: (m, store) => {
      const base = m[0].replace(/\/products$/, '');
      const item = byUrl(store.roster?.items, base);
      if (!item) return { template: '404.html', assigns: {}, status: 404 };
      return {
        template: 'roster-item.html',
        assigns: {
          item: { ...item, products: asArray(store.products) },
          section: m[1] ? 'products' : undefined,
          roster: store.roster,
        },
      };
    },
  },

  { pattern: /^\/contact$/, resolve: () => ({ template: 'contact.html', assigns: {} }) },

  {
    pattern: /^\/search$/,
    resolve: (_m, store, query) => {
      const q = (query.get('q') ?? '').toLowerCase();
      const products = asArray(store.products).filter((p) =>
        q
          ? String(p?.name ?? '')
              .toLowerCase()
              .includes(q)
          : true,
      );
      return { template: 'search.html', assigns: { products, query: query.get('q') ?? '' } };
    },
  },

  {
    pattern: /^\/events$/,
    resolve: (_m, store) => ({ template: 'events.html', assigns: { events: store.events } }),
  },
  {
    pattern: /^\/events\/[^/]+$/,
    resolve: (m, store) => {
      const event = byUrl(store.events, m[0]);
      if (!event) return { template: '404.html', assigns: {}, status: 404 };
      return { template: 'event.html', assigns: { event } };
    },
  },

  {
    pattern: /^\/gallery$/,
    resolve: (_m, store) => ({ template: 'gallery.html', assigns: { gallery: store.gallery } }),
  },
  {
    pattern: /^\/history$/,
    resolve: (_m, store) => ({ template: 'history.html', assigns: { history: store.history } }),
  },

  {
    pattern: /^\/maintenance$/,
    resolve: () => ({ template: 'maintenance.html', bare: true, assigns: {} }),
  },
  {
    pattern: /^\/orders\/[^/]+$/,
    resolve: (m, store) => {
      const orders = asArray(store.orders);
      const order = orders.find((o) => String(o?.number) === m[0].split('/').pop()) ?? orders[0];
      if (!order) return { template: '404.html', assigns: {}, status: 404 };
      return { template: 'order.html', assigns: { order } };
    },
  },
];

/**
 * Resolve a request path to a template and its assigns.
 *
 * @param pathname - request path, e.g. `/products/foo`
 * @param store - the loaded store.json mock data
 * @param query - request query string params
 * @returns the matched route, or a 404 route match if nothing matched
 */
export function resolveRoute(
  pathname: string,
  store: Store,
  query: URLSearchParams = new URLSearchParams(),
): RouteMatch {
  const clean = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  for (const route of routes) {
    const m = clean.match(route.pattern);
    if (m) return route.resolve(m, store, query);
  }
  return { template: '404.html', assigns: {}, status: 404 };
}
