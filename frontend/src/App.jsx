import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./LandingPage";
import AnalyzeExercise from "./AnalyzeExercise";
import AnalyzeComp from "./AnalyzeComp";
import ResultsPage from "./ResultsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/analyze_comp" element = {<AnalyzeComp/>} />
        <Route path="/analyze_exer" element={<AnalyzeExercise />} />
        <Route path="/results_page" element={<ResultsPage />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;

// npm run dev