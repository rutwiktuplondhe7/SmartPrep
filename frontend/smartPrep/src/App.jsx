import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import LandingPage from "./pages/Landingpage";
import Dashboard from "./pages/Home/Dashboard";
import InterviewPrep from "./pages/InterviewPrep/InterviewPrep";
import UserProvider from './context/userContext';

const App = () => {
  return (
    <UserProvider>
      <div>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/interview-prep/:sessionId" element={<InterviewPrep />} />
          </Routes>
        </Router>

        <Toaster
          position="top-center"
          toastOptions={{
            duration: 5000,
            style: {
              fontSize: "14px",
              padding: "12px 16px",
              borderRadius: "10px",
              maxWidth: "520px",
            },
          }}
        />
      </div>
    </UserProvider>
  );
};

export default App;
