import { Link } from 'react-router-dom';
import { Breadcrumbs, Typography } from '@mui/material';
import { NavigateNext } from '@mui/icons-material';

export default function StoreBreadcrumbs({ items }) {
  return (
    <Breadcrumbs
      separator={<NavigateNext fontSize="small" sx={{ color: 'text.disabled' }} />}
      sx={{ mb: 3, '& a': { color: 'text.secondary', textDecoration: 'none', fontSize: 14, '&:hover': { color: 'primary.main' } } }}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        if (isLast) {
          return (
            <Typography key={item.label} color="text.primary" fontSize={14} fontWeight={500}>
              {item.label}
            </Typography>
          );
        }
        return (
          <Link key={item.label} to={item.to}>
            {item.label}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
}
