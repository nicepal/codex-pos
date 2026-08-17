import BlogCard from './BlogCard';
import './BlogGrid.css';

export default function BlogGrid({ posts }) {
  return (
    <div className="blog-grid">
      {posts.map((post) => (
        <BlogCard key={post.slug} post={post} />
      ))}
    </div>
  );
}
