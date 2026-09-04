import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMe, selectAuth } from '../features/auth/authSlice';
import LoadingState from '../components/LoadingState';

export default function AuthInit({ children }) {
  const dispatch = useDispatch();
  const { accessToken, hydrating, user } = useSelector(selectAuth);

  useEffect(() => {
    if (accessToken) {
      dispatch(fetchMe());
    }
  }, [dispatch, accessToken]);

  // Keep existing UI mounted once we have a user (e.g. browser Back / remount).
  if (hydrating && !user) {
    return <LoadingState />;
  }

  return children;
}
