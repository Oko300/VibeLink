import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import BuilderRoom from './pages/BuilderRoom';
import ViewerRoom from './pages/ViewerRoom';
import AuthCallback from './pages/AuthCallback';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/builder/:sessionId" element={<BuilderRoom />} />
        <Route path="/s/:sessionId" element={<ViewerRoom />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
    </Router>
  );
}