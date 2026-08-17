import { Link } from 'react-router-dom';
import { announcement } from '../data/announcement';
import './AnnouncementBar.css';

export default function AnnouncementBar() {
  return (
    <div className="announcement-bar" role="region" aria-label="Announcement">
      <p>
        {announcement.message}{' '}
        <Link to={announcement.href}>{announcement.cta}</Link>
      </p>
    </div>
  );
}
