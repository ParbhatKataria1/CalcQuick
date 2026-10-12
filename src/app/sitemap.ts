import type { MetadataRoute } from 'next';
import { bankingTechniques } from '@/constants/banking-techniques';
import { multiplyDivideTechniques } from '@/constants/multiply-divide-techniques';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const routes = [
    '/', '/practice', '/speed', '/banking-drill', '/banking-method', '/multiply-divide', '/multiply-divide/learn', '/number-facts',
    '/number-facts/tables', '/number-facts/squares', '/number-facts/cubes', '/number-facts/fractions', '/daily-challenge',
    ...bankingTechniques.map(({ id }) => `/banking-method/${id}`),
    ...multiplyDivideTechniques.map(({ id }) => `/multiply-divide/learn/${id}`),
  ];

  return routes.map((route, index) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '/' ? 'weekly' : 'monthly',
    priority: index === 0 ? 1 : 0.8,
  }));
}
