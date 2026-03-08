import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AnalysisPage } from './pages/AnalysisPage';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { JobsPage } from './pages/JobsPage';
import { PromptsPage } from './pages/PromptsPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/"          element={<DashboardPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/jobs"      element={<JobsPage />} />
        <Route path="/analysis"  element={<AnalysisPage />} />
        <Route path="/prompts"   element={<PromptsPage />} />
        <Route path="/settings"  element={<SettingsPage />} />
      </Routes>
    </Layout>
  );
}
