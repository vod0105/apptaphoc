import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from './pages/Home';
import Concentrate from './pages/Concentrate';
import StudyHistory from './pages/StudyHistory';
function App() {
  return (
    <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/concentrate" element={<Concentrate />} />
      <Route path="/history" element={<StudyHistory />} />
        </Routes>
        </BrowserRouter>
  );
}

export default App;
