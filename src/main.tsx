import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { runDevSeed } from './lib/devSeed';
import './index.css';
// NACH index.css: das V5-Aussehen gewinnt so über Tailwind-Preflight/Utilities.
import './styles/theme.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function mount() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
}

// runDevSeed() ist in der Produktion ein sofort auflösender No-op (siehe
// lib/devSeed.ts) — kein Top-Level-await, damit das Build-Target passt.
void runDevSeed().finally(mount);
