import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import LandingPage from "./pages/Landingpage";
import Dashboard from "./pages/Home/Dashboard";
import MockInterview from "./pages/InterviewPrep/MockInterview";
import Summary from "./pages/InterviewPrep/SummaryPage";
import UserProvider from "./context/userContext";

const App = () => {
  return (
    <UserProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Interview Flow */}
          <Route
            path="/mock-interview/:sessionId"
            element={<MockInterview />}
          />

          {/* Summary Page */}
          <Route
            path="/summary/:sessionId"
            element={<Summary />}
          />
        </Routes>

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
      </Router>
    </UserProvider>
  );
};

export default App;
