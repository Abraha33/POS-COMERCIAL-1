import { useQuery } from '@tanstack/react-query';
import {
  agingReportSchema, inventoryValuationSchema, salesSummarySchema, type AgingReport, type InventoryValuation,
  type SalesSummary,
} from '@/shared/contracts';
import { api, type ApiError } from './client';

/** Reportes agregados por el servidor (PROPUESTA v0.5.0); exigen `reports.view`. */

const queryString = (params: Record<string, string | undefined>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : '';
};

export type SalesSummaryFilters = { from?: string; to?: string; branchId?: string };

export const useSalesSummary = (filters: SalesSummaryFilters = {}) =>
  useQuery<SalesSummary, ApiError>({
    queryKey: ['reports', 'sales-summary', filters],
    queryFn: () => api.get(`/reports/sales-summary${queryString(filters)}`, salesSummarySchema),
  });

export const useAgingReport = (filters: { asOf?: string; branchId?: string } = {}) =>
  useQuery<AgingReport, ApiError>({
    queryKey: ['reports', 'aging', filters],
    queryFn: () => api.get(`/reports/aging${queryString(filters)}`, agingReportSchema),
  });

export const useInventoryValuation = (filters: { branchId?: string } = {}) =>
  useQuery<InventoryValuation, ApiError>({
    queryKey: ['reports', 'inventory-valuation', filters],
    queryFn: () => api.get(`/reports/inventory-valuation${queryString(filters)}`, inventoryValuationSchema),
  });
