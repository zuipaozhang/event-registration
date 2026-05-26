import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import RegisterPage from './pages/RegisterPage';

export default function App() {
  return (
    <BrowserRouter basename="/event-registration/">
      <Routes>
        <Route path="/register/:slug" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/register/tech-open-day-2026" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
