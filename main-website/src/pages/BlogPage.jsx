import BlogGrid from '../components/BlogGrid';
import { blogPosts } from '../data/blog';
import { usePageMeta } from '../hooks/usePageMeta';

export default function BlogPage() {
  usePageMeta({
    title: 'Blog',
    description: 'Notes on POS, inventory, Shopify import, AI insights, and the PosHive developer platform.',
    path: '/blog',
  });

  return (
    <div className="page-shell">
      <header className="container page-hero">
        <p className="section-label">Blog</p>
        <h1>Field notes for retail operators</h1>
        <p>Demo articles that mirror real product capabilities — not vaporware roadmaps.</p>
      </header>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <BlogGrid posts={blogPosts} />
        </div>
      </section>
    </div>
  );
}
