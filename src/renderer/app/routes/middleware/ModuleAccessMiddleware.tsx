import { Outlet } from 'react-router-dom';

export function ModuleAccessMiddleware() {
  const token = localStorage.getItem('token');
  if (!token) {
    return null;
  }
  return <Outlet />;
}
