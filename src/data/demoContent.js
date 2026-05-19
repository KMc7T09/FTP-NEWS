import { articles } from '../ftp-news-content/articles.js';
import { categories } from '../ftp-news-content/categories.js';

export const demoCategories = categories;
export const demoArticles = articles;
export const staticArticles = articles;
export const staticCategories = categories;

export function getPublishedArticles() {
  return staticArticles
    .filter((article) => article.status === 'published')
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
}

export function getFeaturedArticles() {
  return getPublishedArticles().filter((article) => article.isFeatured);
}

export function getTrendingArticles() {
  return getPublishedArticles().filter((article) => article.isTrending);
}

export function getArticleBySlug(slug) {
  return staticArticles.find((article) => article.slug === slug && article.status === 'published') || null;
}

export function getArticlesByCategory(slug) {
  return getPublishedArticles().filter((article) => article.categorySlug === slug || article.categoryId === slug);
}

export function searchArticles(term) {
  const value = term.trim().toLowerCase();
  return getPublishedArticles().filter((article) => {
    const haystack = [article.title, article.categoryName, article.excerpt, article.content, ...(article.tags || [])]
      .join(' ')
      .toLowerCase();
    return !value || haystack.includes(value);
  });
}
