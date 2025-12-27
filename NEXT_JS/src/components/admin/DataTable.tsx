'use client';

import { useState, useMemo } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: string[];
  pageSize?: number;
  emptyMessage?: string;
  loading?: boolean;
  onRowClick?: (item: T) => void;
  actions?: (item: T) => React.ReactNode;
  bulkActions?: React.ReactNode;
  selectedItems?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  keyExtractor,
  searchable = true,
  searchPlaceholder = 'Buscar...',
  searchKeys = [],
  pageSize = 10,
  emptyMessage = 'Nenhum item encontrado',
  loading = false,
  onRowClick,
  actions,
  bulkActions,
  selectedItems = [],
  onSelectionChange,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Filtrar dados
  const filteredData = useMemo(() => {
    if (!search.trim()) return data;

    const searchLower = search.toLowerCase();
    const keys = searchKeys.length > 0 ? searchKeys : columns.map((c) => c.key);

    return data.filter((item) =>
      keys.some((key) => {
        const value = item[key];
        if (value == null) return false;
        return String(value).toLowerCase().includes(searchLower);
      })
    );
  }, [data, search, searchKeys, columns]);

  // Ordenar dados
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
      if (bValue == null) return sortDirection === 'asc' ? -1 : 1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortKey, sortDirection]);

  // Paginar dados
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Handlers
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    const allIds = paginatedData.map(keyExtractor);
    const allSelected = allIds.every((id) => selectedItems.includes(id));
    if (allSelected) {
      onSelectionChange(selectedItems.filter((id) => !allIds.includes(id)));
    } else {
      onSelectionChange([...new Set([...selectedItems, ...allIds])]);
    }
  };

  const handleSelectItem = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedItems.includes(id)) {
      onSelectionChange(selectedItems.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedItems, id]);
    }
  };

  const allSelected = paginatedData.length > 0 && paginatedData.every((item) => selectedItems.includes(keyExtractor(item)));

  return (
    <div className="data-table">
      {/* Toolbar */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        {searchable && (
          <div className="input-group" style={{ maxWidth: 300 }}>
            <span className="input-group-text bg-white">
              <i className="bi bi-search"></i>
            </span>
            <input
              type="text"
              className="form-control border-start-0"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
            {search && (
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={() => setSearch('')}
              >
                <i className="bi bi-x"></i>
              </button>
            )}
          </div>
        )}

        {bulkActions && selectedItems.length > 0 && (
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted small">{selectedItems.length} selecionado(s)</span>
            {bulkActions}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              {onSelectionChange && (
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={allSelected}
                    onChange={handleSelectAll}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`${column.headerClassName || ''} ${column.sortable ? 'cursor-pointer user-select-none' : ''}`}
                  onClick={column.sortable ? () => handleSort(column.key) : undefined}
                  style={column.sortable ? { cursor: 'pointer' } : undefined}
                >
                  <div className="d-flex align-items-center gap-1">
                    {column.header}
                    {column.sortable && (
                      <span className="text-muted">
                        {sortKey === column.key ? (
                          sortDirection === 'asc' ? (
                            <i className="bi bi-sort-up"></i>
                          ) : (
                            <i className="bi bi-sort-down"></i>
                          )
                        ) : (
                          <i className="bi bi-filter opacity-50"></i>
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {actions && <th style={{ width: 100 }}>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (onSelectionChange ? 1 : 0) + (actions ? 1 : 0)} className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Carregando...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onSelectionChange ? 1 : 0) + (actions ? 1 : 0)} className="text-center py-5 text-muted">
                  <i className="bi bi-inbox" style={{ fontSize: '2rem' }}></i>
                  <p className="mb-0 mt-2">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => {
                const id = keyExtractor(item);
                const isSelected = selectedItems.includes(id);
                return (
                  <tr
                    key={id}
                    className={`${onRowClick ? 'cursor-pointer' : ''} ${isSelected ? 'table-active' : ''}`}
                    onClick={onRowClick ? () => onRowClick(item) : undefined}
                    style={onRowClick ? { cursor: 'pointer' } : undefined}
                  >
                    {onSelectionChange && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={isSelected}
                          onChange={() => handleSelectItem(id)}
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td key={column.key} className={column.className}>
                        {column.render
                          ? column.render(item)
                          : (item[column.key] as React.ReactNode) ?? '-'}
                      </td>
                    ))}
                    {actions && (
                      <td onClick={(e) => e.stopPropagation()}>{actions(item)}</td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
          <span className="text-muted small">
            Mostrando {(currentPage - 1) * pageSize + 1} a{' '}
            {Math.min(currentPage * pageSize, sortedData.length)} de {sortedData.length}
          </span>
          <nav>
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <i className="bi bi-chevron-double-left"></i>
                </button>
              </li>
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <i className="bi bi-chevron-left"></i>
                </button>
              </li>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => setCurrentPage(page)}>
                      {page}
                    </button>
                  </li>
                );
              })}
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <i className="bi bi-chevron-right"></i>
                </button>
              </li>
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <i className="bi bi-chevron-double-right"></i>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}

// Componente auxiliar para estatísticas
export function StatCard({ 
  title, 
  value, 
  icon, 
  color = 'primary',
  trend,
  trendLabel,
}: { 
  title: string; 
  value: string | number; 
  icon: string;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
}) {
  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <p className="text-muted small mb-1">{title}</p>
            <h3 className="mb-0 fw-bold">{value}</h3>
            {trendLabel && (
              <small className={`text-${trend === 'up' ? 'success' : trend === 'down' ? 'danger' : 'muted'}`}>
                {trend === 'up' && <i className="bi bi-arrow-up"></i>}
                {trend === 'down' && <i className="bi bi-arrow-down"></i>}
                {' '}{trendLabel}
              </small>
            )}
          </div>
          <div className={`bg-${color} bg-opacity-10 p-3 rounded`}>
            <i className={`bi ${icon} text-${color}`} style={{ fontSize: '1.5rem' }}></i>
          </div>
        </div>
      </div>
    </div>
  );
}
