import { Link } from 'react-router-dom';
import BlogCard from './BlogCard';

export default function RelatedPosts({ posts }) {
  if (!posts?.length) return null;
  return (
    <aside className="related-posts section" aria-labelledby="related-heading">
      <div className="container">
        <h2 id="related-heading" className="section-title">
          Related reading
        </h2>
        <div className="grid-2" style={{ marginTop: '1.5rem' }}>
          {posts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
        <p style={{ marginTop: '1.25rem' }}>
          <Link to="/blog">View all posts →</Link>
        </p>
      </div>
    </aside>
  );
}
