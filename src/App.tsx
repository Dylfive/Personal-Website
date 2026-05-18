import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Resume from './pages/Resume';
import Projects from './pages/Projects';
import About from './pages/About';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground selection:bg-neon-purple/30">
        <Navbar />
        <main className="pt-20">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/resume" element={<Resume />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </main>
        <footer className="py-10 text-center text-white/40 text-sm border-t border-white/5">
          <p>© {new Date().getFullYear()} Personal Portfolio. Built with React & Neon Vibes.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
