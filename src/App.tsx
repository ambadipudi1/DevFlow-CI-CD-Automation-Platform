import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
import { Sidebar } from './components/Sidebar.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { RepositoriesPage } from './pages/RepositoriesPage.js';
import { PipelinesPage } from './pages/PipelinesPage.js';
import { WorkflowRunsPage } from './pages/WorkflowRunsPage.js';
import { WorkflowRunDetailsPage } from './pages/WorkflowRunDetailsPage.js';
import { FailureAnalyzerPage } from './pages/FailureAnalyzerPage.js';
import { DockerBuildsPage } from './pages/DockerBuildsPage.js';
import { DeploymentsPage } from './pages/DeploymentsPage.js';
import { ReportsPage } from './pages/ReportsPage.js';
import { IntegrationsPage } from './pages/IntegrationsPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { TriggerPipelineModal } from './components/modals/TriggerPipelineModal.js';
import { WorkflowYamlModal } from './components/modals/WorkflowYamlModal.js';
import { DemoManageModal } from './components/modals/DemoManageModal.js';
import { api } from './services/api.js';
import {
  IntegrationStatus,
  Repository,
  Pipeline,
  WorkflowRun,
  FailureDiagnosis,
  Deployment,
  DockerBuild,
  AuditLog,
  AnalyticsSummary,
} from './types/client.js';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [dockerBuilds, setDockerBuilds] = useState<DockerBuild[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);

  // Selected Run for Details View
  const [selectedRunDetails, setSelectedRunDetails] = useState<{
    run: WorkflowRun;
    logs: { raw_log: string; sanitized_log: string } | null;
    diagnosis: FailureDiagnosis | null;
    docker_builds: DockerBuild[];
  } | null>(null);

  // Failure Analyzer selected run
  const [analyzerRunId, setAnalyzerRunId] = useState<string | null>(null);
  const [activeDiagnosis, setActiveDiagnosis] = useState<FailureDiagnosis | null>(null);

  // Modals
  const [isTriggerModalOpen, setIsTriggerModalOpen] = useState(false);
  const [yamlModalData, setYamlModalData] = useState<{ yaml: string; filename: string } | null>(null);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  // Loading state
  const [loading, setLoading] = useState(true);

  const loadAllData = async () => {
    try {
      const [
        statusRes,
        reposRes,
        pipesRes,
        runsRes,
        depsRes,
        dockRes,
        auditRes,
        analyticsRes,
      ] = await Promise.all([
        api.getIntegrationStatus(),
        api.getRepositories(),
        api.getPipelines(),
        api.getWorkflowRuns(),
        api.getDeployments(),
        api.getDockerBuilds(),
        api.getAuditLogs(),
        api.getAnalytics(),
      ]);

      setStatus(statusRes);
      setRepositories(reposRes);
      setPipelines(pipesRes);
      setRuns(runsRes.runs);
      setDeployments(depsRes);
      setDockerBuilds(dockRes);
      setAuditLogs(auditRes);
      setAnalytics(analyticsRes);
    } catch (err: any) {
      console.error('Failed to load DevFlow data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // When a run is selected for detail view
  const handleSelectRun = async (runId: string) => {
    try {
      const details = await api.getWorkflowRunDetails(runId);
      setSelectedRunDetails(details);
      setCurrentTab('run_details');
    } catch (err: any) {
      console.error('Failed to load run details:', err);
    }
  };

  // When navigating to failure analyzer
  const handleNavigateToAnalyzer = async (runId?: string) => {
    const targetId = runId || failedRuns[0]?.id;
    if (targetId) {
      setAnalyzerRunId(targetId);
      try {
        const diag = await api.getDiagnosis(targetId);
        setActiveDiagnosis(diag);
      } catch {
        setActiveDiagnosis(null);
      }
    }
    setCurrentTab('analyzer');
  };

  // Triggering new pipeline run
  const handleTriggerRun = async (data: {
    pipeline_id: string;
    branch?: string;
    simulated_outcome: 'success' | 'failure' | 'real_github';
    failure_type?: 'missing_deps' | 'typescript' | 'test_assertion' | 'missing_env' | 'docker';
  }) => {
    const newRun = await api.triggerWorkflowRun(data);
    await loadAllData();
    // Automatically view the newly triggered run
    await handleSelectRun(newRun.id);
  };

  // View YAML
  const handleViewYaml = async (pipelineId: string) => {
    try {
      const res = await api.getWorkflowYaml(pipelineId);
      setYamlModalData(res);
    } catch (err: any) {
      alert(`Failed to generate YAML: ${err.message}`);
    }
  };

  const failedRuns = runs.filter((r) => r.conclusion === 'failure');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        status={status}
        onRefresh={loadAllData}
        onOpenTriggerModal={() => setIsTriggerModalOpen(true)}
        onToggleDemoModal={() => setIsDemoModalOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setSelectedRunDetails(null);
            if (tab === 'analyzer') {
              handleNavigateToAnalyzer();
            } else {
              setCurrentTab(tab);
            }
          }}
          failureCount={failedRuns.length}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-7xl mx-auto w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
              <p className="text-xs text-slate-400 font-mono">Connecting to SQLite database...</p>
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardPage
                  analytics={analytics}
                  recentRuns={runs}
                  pipelines={pipelines}
                  onSelectRun={handleSelectRun}
                  onNavigate={(tab) => {
                    if (tab === 'analyzer') handleNavigateToAnalyzer();
                    else setCurrentTab(tab);
                  }}
                  onOpenTriggerModal={() => setIsTriggerModalOpen(true)}
                />
              )}

              {currentTab === 'repositories' && (
                <RepositoriesPage
                  repositories={repositories}
                  onSyncGithub={async () => {
                    await api.syncGithubRepositories();
                    await loadAllData();
                  }}
                  onCreateRepo={async (data) => {
                    await api.createRepository(data);
                    await loadAllData();
                  }}
                  onNavigate={setCurrentTab}
                  hasGithubToken={!!status?.github.hasToken}
                />
              )}

              {currentTab === 'pipelines' && (
                <PipelinesPage
                  pipelines={pipelines}
                  repositories={repositories}
                  onCreatePipeline={async (data) => {
                    await api.createPipeline(data);
                    await loadAllData();
                  }}
                  onDeletePipeline={async (id) => {
                    const res = await api.deletePipeline(id);
                    await loadAllData();
                    return { success: res.deleted };
                  }}
                  onViewYaml={handleViewYaml}
                  onTriggerRun={(pipeId) => {
                    setIsTriggerModalOpen(true);
                  }}
                />
              )}

              {currentTab === 'runs' && (
                <WorkflowRunsPage
                  runs={runs}
                  pipelines={pipelines}
                  repositories={repositories}
                  onSelectRun={handleSelectRun}
                  onOpenTriggerModal={() => setIsTriggerModalOpen(true)}
                  onNavigate={setCurrentTab}
                  onFilterChange={async (filters) => {
                    const res = await api.getWorkflowRuns(filters);
                    setRuns(res.runs);
                  }}
                />
              )}

              {currentTab === 'run_details' && selectedRunDetails && (
                <WorkflowRunDetailsPage
                  run={selectedRunDetails.run}
                  logs={selectedRunDetails.logs}
                  diagnosis={selectedRunDetails.diagnosis}
                  dockerBuilds={selectedRunDetails.docker_builds}
                  onBack={() => setCurrentTab('runs')}
                  onNavigateToAnalyzer={(runId) => handleNavigateToAnalyzer(runId)}
                  onRerun={(pipeId) => {
                    setIsTriggerModalOpen(true);
                  }}
                />
              )}

              {currentTab === 'analyzer' && (
                <FailureAnalyzerPage
                  failedRuns={failedRuns}
                  selectedRunId={analyzerRunId}
                  onSelectRunId={async (id) => {
                    setAnalyzerRunId(id);
                    try {
                      const diag = await api.getDiagnosis(id);
                      setActiveDiagnosis(diag);
                    } catch {
                      setActiveDiagnosis(null);
                    }
                  }}
                  diagnosis={activeDiagnosis}
                  onRequestAiDiagnosis={async (runId) => {
                    const res = await api.triggerAiDiagnosis(runId);
                    setActiveDiagnosis(res.diagnosis);
                    await loadAllData();
                  }}
                  onApplyRemediation={async (data) => {
                    const res = await api.applyRemediationAndRerun(data);
                    await loadAllData();
                    return res;
                  }}
                  isAiAvailable={!!status?.gemini.isConfigured}
                />
              )}

              {currentTab === 'docker' && (
                <DockerBuildsPage
                  dockerBuilds={dockerBuilds}
                  onSelectRun={handleSelectRun}
                />
              )}

              {currentTab === 'deployments' && (
                <DeploymentsPage
                  deployments={deployments}
                  onTriggerHealthCheck={async (depId) => {
                    await api.triggerHealthCheck(depId);
                    await loadAllData();
                  }}
                  onSelectRun={handleSelectRun}
                />
              )}

              {currentTab === 'reports' && (
                <ReportsPage analytics={analytics} />
              )}

              {currentTab === 'integrations' && (
                <IntegrationsPage
                  status={status}
                  onConfigureToken={async (data) => {
                    await api.configureToken(data);
                    await loadAllData();
                  }}
                  onRefresh={loadAllData}
                />
              )}

              {currentTab === 'settings' && (
                <SettingsPage
                  auditLogs={auditLogs}
                  onRefresh={loadAllData}
                  onSeedDemo={async () => {
                    await api.seedDemo();
                    await loadAllData();
                  }}
                  onPurgeDemo={async () => {
                    await api.purgeDemo();
                    await loadAllData();
                  }}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Modals */}
      <TriggerPipelineModal
        pipelines={pipelines}
        isOpen={isTriggerModalOpen}
        onClose={() => setIsTriggerModalOpen(false)}
        onTrigger={handleTriggerRun}
        hasGithubToken={!!status?.github.hasToken}
      />

      <WorkflowYamlModal
        yaml={yamlModalData?.yaml || null}
        filename={yamlModalData?.filename}
        isOpen={!!yamlModalData}
        onClose={() => setYamlModalData(null)}
      />

      <DemoManageModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onPurge={async () => {
          await api.purgeDemo();
          await loadAllData();
        }}
        onSeed={async () => {
          await api.seedDemo();
          await loadAllData();
        }}
      />
    </div>
  );
}
