import { Navigate } from 'react-router-dom';
import LoadingScreen from '../components/ui/LoadingScreen.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function GuestRoute({ children }) {
  const { currentUser, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (currentUser) return <Navigate to="/profile" replace />;
  return children;
}
