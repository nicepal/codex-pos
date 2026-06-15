import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMe, selectAuth } from '../features/auth/authSlice';
import LoadingState from '../components/LoadingState';

export default function AuthInit({ children }) {
  const dispatch = useDispatch();
  const { accessToken, hydrating } = useSelector(selectAuth);

  useEffect(() => {
    if (accessToken) {
      dispatch(fetchMe());
    }
  }, [dispatch, accessToken]);

  if (hydrating) {
    return <LoadingState />;
  }

  return children;
}
