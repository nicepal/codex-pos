import { Link } from 'react-router-dom';
import './BlogCard.css';

export default function BlogCard({ post }) {
  return (
    <article className="blog-card">
      <div className="blog-card-meta">
        <time dateTime={post.date}>{post.date}</time>
        <span>{post.readMinutes} min</span>
      </div>
      <h3>
        <Link to={`/blog/${post.slug}`}>{post.title}</Link>
      </h3>
      <p>{post.excerpt}</p>
      <div className="blog-card-tags">
        {post.tags.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </article>
  );
}
