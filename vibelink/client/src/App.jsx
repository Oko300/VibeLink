import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import BuilderRoom from './pages/BuilderRoom';
import ViewerRoom from './pages/ViewerRoom';


export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/builder/:sessionId" element={<BuilderRoom />} />
        <Route path="/s/:sessionId" element={<ViewerRoom />} />

      </Routes>
    </Router>
  );
}