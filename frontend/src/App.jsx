import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SearchPage from './pages/SearchPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import ProfilePage from './pages/ProfilePage';
import MessagingPage from './pages/MessagingPage';
import VirtualClassroomPage from './pages/VirtualClassroomPage';
import NotFoundPage from './pages/NotFoundPage';
import AdminDashboard from './pages/AdminDashboard';
import PaymentCallbackPage from './pages/PaymentCallbackPage';
import ContactPage from './pages/ContactPage';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './context/AuthContext';
import { CallProvider } from './context/CallContext';
import CallOverlay from './components/CallOverlay';
import Chatbot from './components/Chatbot';
import ScrollToTop from './components/ScrollToTop';
import Navbar from './components/Navbar';
import NotificationManager from './components/NotificationManager';
import ProtectedRoute from './components/ProtectedRoute';
import usePresence from './hooks/usePresence';

// Simple Error Boundary for debugging white screens
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', color: '#e11d48', background: '#fff1f2', minHeight: '100vh', fontFamily: 'sans-serif' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>🔴 Erreur de rendu détectée</h1>
          <p style={{ marginBottom: '20px', color: '#9f1239' }}>Une erreur critique s'est produite dans l'application :</p>
          <pre style={{ padding: '20px', background: 'white', borderRadius: '8px', border: '1px solid #fda4af', overflowX: 'auto', fontSize: '14px' }}>
            {this.state.error.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '20px', padding: '10px 20px', background: '#e11d48', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Recharger la page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Inner component so useLocation and usePresence have Router/AuthContext access
const AppContent = () => {
  const location = useLocation();
  console.log("AppContent rendering at", location.pathname);
  usePresence();

  return (
    <>
      <ScrollToTop />
      <Toaster position="top-right" />
      <NotificationManager />
      <Navbar />
      <Chatbot />
      <CallOverlay />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/tutors" element={<SearchPage />} />
        <Route path="/payment-callback" element={<PaymentCallbackPage />} />
        <Route path="/contact" element={<ContactPage />} />

        {/* Protected Routes */}
        <Route path="/admin-dashboard" element={
          <ProtectedRoute adminOnly={true}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/student-dashboard" element={
          <ProtectedRoute>
            <StudentDashboard />
          </ProtectedRoute>
        } />
        <Route path="/teacher-dashboard" element={
          <ProtectedRoute>
            <TeacherDashboard />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />
        <Route path="/messages" element={
          <ProtectedRoute>
            <MessagingPage />
          </ProtectedRoute>
        } />
        <Route path="/classroom/:bookingId" element={
          <ProtectedRoute>
            <VirtualClassroomPage />
          </ProtectedRoute>
        } />

        <Route path="/404" element={<NotFoundPage />} />
        {/* Catch-all 404 Page */}
        <Route path="*" element={<ErrorBoundary><NotFoundPage /></ErrorBoundary>} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <CallProvider>
            <AppContent />
          </CallProvider>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
