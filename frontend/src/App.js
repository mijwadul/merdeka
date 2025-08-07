// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AITools from './pages/aitools/AITools';
import LayoutRetrieverPage from './pages/aitools/LayoutRetrieverPage';
import BookRetrieverPage from './pages/aitools/BookRetrieverPage';
import CpUploader from './pages/aitools/CpUploader';
import GeneratorWizardPage from './pages/aitools/GeneratorWizardPage'; 
import UserManagementPage from './pages/user/UserManagementPage';
import ProtectedRoute from './components/ProtectedRoute';
import LayoutListPage from './components/ai/LayoutListPage';
import Layout from './components/Layout'; 
import SchoolManagementPage from './pages/SchoolManagementPage';
import ClassManagementPage from './pages/ClassManagementPage';
import { AnimatePresence } from 'framer-motion';
import DocsPage from './pages/DocsPage';
import DocDetailPage from './pages/DocDetailPage';

function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<LoginPage />} />
        
        <Route 
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/ai/tools" element={<AITools />} />
          <Route path="/aitools/layout-retriever" element={<LayoutRetrieverPage/>} />
          <Route path="/layouts" element={<LayoutListPage />} />
          <Route path="/aitools/book-retriever" element={<BookRetrieverPage />} />
          <Route path="/aitools/cp-upload" element={<CpUploader />} />
          <Route path="/aitools/generator-wizard" element={<GeneratorWizardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/schools" element={<SchoolManagementPage />} />
          <Route path="/classes" element={<ClassManagementPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/docs/:docModel/:docId" element={<DocDetailPage />} />
          <Route path="/users" element={<UserManagementPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;