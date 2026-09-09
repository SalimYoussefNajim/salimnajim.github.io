import type { APIRoute } from 'astro';
import { site } from '../data/site';
export const GET: APIRoute = () => {
  const routes = ['/', '/about/', '/aerospace/', '/ventures/', '/projects/', '/projects/lumos/', '/achievements/', '/contact/'];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map(route=>`<url><loc>${site.url}${route}</loc></url>`).join('')}</urlset>`,{headers:{'Content-Type':'application/xml'}});
};
