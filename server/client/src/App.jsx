import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import InboxView from "./components/InboxView";
import LoginPage from "./components/LoginPage";

const App = () => {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("https://ai-email-backend-ai-73581a558d17.herokuapp.com/me", {
          credentials: "include",
        });
        setIsAuthenticated(res.ok);
      } catch (err) {
        console.error("❌ Auth check failed:", err);
        setIsAuthenticated(false);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);


  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/inbox" /> : <LoginPage />}
        />
        <Route path="/inbox" element={<InboxView />} />
        <Route path="/oauth-success" element={<Navigate to="/inbox" />} />
      </Routes>
    </Router>
  );
};

export default App;
