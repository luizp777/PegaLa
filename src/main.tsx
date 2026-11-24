import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { appLogger, installGlobalErrorHandlers, serializeError } from './lib/logger';

installGlobalErrorHandlers();

/**
 * Propriedades aceitas pelo {@link AppErrorBoundary}.
 */
interface ErrorBoundaryProps {
  /** Árvore de componentes filhos protegida contra exceções de renderização. */
  children: ReactNode;
}

/**
 * Estado interno do {@link AppErrorBoundary}.
 */
interface ErrorBoundaryState {
  /** Erro capturado durante o ciclo de renderização, ou `null` quando saudável. */
  error: Error | null;
}

/**
 * Fronteira de erro React de nível raiz que evita tela em branco caso ocorra alguma exceção inesperada em tempo de execução.
 */
class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  /** Estado inicial sem erro capturado. */
  state: ErrorBoundaryState = { error: null };

  /**
   * Atualiza o estado do componente quando um componente filho lança uma exceção.
   *
   * @param error - Exceção lançada durante a renderização.
   * @returns Novo estado contendo o erro capturado.
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  /**
   * Registra detalhes do erro capturado no console para diagnóstico.
   *
   * @param error - Instância do erro lançado.
   * @param info - Pilha de componentes React onde o erro ocorreu.
   */
  componentDidCatch(error: Error, info: ErrorInfo) {
    appLogger.fatal('Erro de renderização capturado pelo ErrorBoundary', {
      error: serializeError(error),
      componentStack: info.componentStack,
    });
  }

  /**
   * Renderiza a tela amigável de recuperação em caso de erro ou os filhos normalmente.
   *
   * @returns Elemento React renderizado.
   */
  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-50 p-6 text-center text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
          <h1 className="text-lg font-bold">Ops! Algo deu errado ao abrir o PegaLá</h1>
          <p className="mt-2 max-w-md rounded-xl bg-red-50 p-3 font-mono text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>
);
