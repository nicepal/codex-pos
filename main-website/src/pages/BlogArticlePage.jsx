import { Link, useParams } from 'react-router-dom';
import { getPost, getRelatedPosts } from '../data/blog';
import RelatedPosts from '../components/RelatedPosts';
import { usePageMeta } from '../hooks/usePageMeta';
import '../components/BlogCard.css';

export default function BlogArticlePage() {
  const { slug } = useParams();
  const post = getPost(slug);

  usePageMeta({
    title: post?.title || 'Article',
    description: post?.excerpt || 'CodexPOS blog article',
    path: `/blog/${slug}`,
    type: 'article',
  });

  if (!post) {
    return (
      <div className="page-shell container">
        <h1>Article not found</h1>
        <p>
          <Link to="/blog">Back to blog</Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <article className="page-shell">
        <header className="container page-hero">
          <p className="section-label">
            <Link to="/blog">Blog</Link>
          </p>
          <h1>{post.title}</h1>
          <p>
            <time dateTime={post.date}>{post.date}</time> · {post.readMinutes} min read
          </p>
        </header>
        <div className="container prose" style={{ paddingBottom: '3rem' }}>
          {post.body.map((para) => (
            <p key={para.slice(0, 24)}>{para}</p>
          ))}
          <div className="blog-card-tags" style={{ marginTop: '1.5rem' }}>
            {post.tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
      </article>
      <RelatedPosts posts={getRelatedPosts(post.slug)} />
    </>
  );
}
