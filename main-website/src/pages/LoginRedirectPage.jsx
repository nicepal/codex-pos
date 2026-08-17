import { useEffect } from 'react';
import { loginUrl } from '../data/site';

/** Marketing /login redirects into the real app login. */
export default function LoginRedirectPage() {
  useEffect(() => {
    window.location.replace(loginUrl);
  }, []);

  return (
    <div className="page-shell container">
      <h1>Redirecting to Login…</h1>
      <p>
        If nothing happens, <a className="text-link" href={loginUrl}>continue to login</a>.
      </p>
    </div>
  );
}
