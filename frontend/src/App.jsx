import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";                        // use = js function = react hook (incorporates useState, useEffect, useContext internally).  AuthProvider = provides authentication to everything inside 

import LandingPage from "./LandingPage";
import AnalyzeExercise from "./AnalyzeExercise";
import AnalyzeComp from "./AnalyzeComp";
import ResultsPage from "./ResultsPage";
import LoginPage from "./LoginPage";
import Dashboard from "./Dashboard";
import WorkoutDetails from "./WorkoutDetails"

function ProtectedRoute({children}) {       // children = property
  const {user, loading} = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace/>
}

export default function App() {     // export = makes something available for others. default = declares this as main thing exported in the file (no need for {} in other file)
  return (
    <AuthProvider>                 
      <BrowserRouter>
        <Routes> 
          <Route path="/login" element={<LoginPage/>} />              {/* public */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard/></ProtectedRoute>} />
          <Route path="/workout/:id" element={<ProtectedRoute><WorkoutDetails/></ProtectedRoute>} />

          <Route path="/analyze_comp" element = {<AnalyzeComp/>} />
          <Route path="/analyze" element={<AnalyzeExercise />} />
          <Route path="/results_page" element={<ResultsPage />} />

          <Route path="/" element={<LandingPage />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

// npm run dev