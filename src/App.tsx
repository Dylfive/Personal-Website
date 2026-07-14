import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Resume from './pages/Resume';
import Projects from './pages/Projects';
import Contact from './pages/Contact';
import IntakePage from './pages/IntakePage';

function App() {
  return (
    <Router basename="/Personal-Website/">
      <div className="min-h-screen bg-background text-foreground selection:bg-neon-purple/30">
        <Navbar />
        <main className="pt-20">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/resume" element={<Resume />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/intake" element={<IntakePage />} />
          </Routes>
        </main>
        <footer className="py-10 border-t border-white/5">
          <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/40 text-sm">© {new Date().getFullYear()} Dylan Gauvin</p>
            <div className="flex items-center gap-6 text-white/40 text-sm">
              <a href="https://github.com/Dylfive" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
              <a href="https://www.linkedin.com/in/dylan-gauvin/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">LinkedIn</a>
              <a href="mailto:dylangauvin@me.com" className="hover:text-white transition-colors">Email</a>
              <a href={`${import.meta.env.BASE_URL}Dylan-Gauvin-Resume.pdf`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Resume</a>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
