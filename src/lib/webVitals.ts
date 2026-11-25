import { appLogger } from './logger';

/**
 * Resumo de uma métrica Core Web Vitals capturada na sessão atual.
 */
export interface WebVitalSnapshot {
  /** Valor numérico da métrica (ms para tempos, adimensional para CLS). */
  value: number;
  /** Classificação qualitativa segundo limiares do Google (`good`, `needs-improvement`, `poor`). */
  rating: string;
}

const vitalsSnapshot: Record<string, WebVitalSnapshot> = {};
let initialized = false;

/**
 * Carrega `web-vitals` de forma assíncrona após o primeiro render e registra
 * LCP, INP, CLS, FCP e TTFB no logger estruturado local.
 */
export function initWebVitals(): void {
  if (initialized || typeof window === 'undefined' || import.meta.env.MODE === 'test') return;
  initialized = true;

  void import('web-vitals')
    .then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
      const record = (metric: { name: string; value: number; rating: string }) => {
        const rounded = metric.name === 'CLS' ? Number(metric.value.toFixed(4)) : Math.round(metric.value);
        vitalsSnapshot[metric.name] = { value: rounded, rating: metric.rating };
        appLogger.info('WebVital', {
          metric: metric.name,
          value: rounded,
          rating: metric.rating,
        });
      };

      onLCP(record);
      onINP(record);
      onCLS(record);
      onFCP(record);
      onTTFB(record);
    })
    .catch(() => {
      // Ignora falhas de carregamento dinâmico em ambientes offline restritos
    });
}

/**
 * Retorna um snapshot das métricas Core Web Vitals já coletadas na sessão atual.
 *
 * @returns Mapa imutável com o último valor e classificação por métrica.
 */
export function getWebVitalsSnapshot(): Record<string, WebVitalSnapshot> {
  return { ...vitalsSnapshot };
}
