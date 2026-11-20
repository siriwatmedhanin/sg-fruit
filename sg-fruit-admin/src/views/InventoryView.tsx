import React, { useState, useEffect, useCallback } from 'react';
import {
  Boxes,
  Search,
  Filter,
  ArrowUpDown,
  History,
  FileBarChart,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Package,
} from 'lucide-react';
import type { AuthRole, Category, InventoryItem, InventorySummary } from '../types';
import { fetchInventory, fetchInventorySummary } from '../services/api';
import { StockActionModal } from '../components/StockActionModal';
import { StockHistoryModal } from '../components/StockHistoryModal';
import { InventoryReportsModal } from '../components/InventoryReportsModal';

interface InventoryViewProps {
  role: AuthRole;
  categories: Category[];
  onRefreshStats?: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  role,
  categories,
  onRefreshStats,
}) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('updated_desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [selectedItemForAction, setSelectedItemForAction] = useState<InventoryItem | null>(null);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<InventoryItem | null>(null);
  const [isAllHistoryOpen, setIsAllHistoryOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, invRes] = await Promise.all([
        fetchInventorySummary(role),
        fetchInventory(role, {
          q: search || undefined,
          category_id: categoryId || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          sort_by: sortBy,
          page,
          limit: 25,
        }),
      ]);

      if (sumRes.ok) setSummary(sumRes.data);
      if (invRes.ok) {
        setItems(invRes.data);
        setTotalPages(invRes.total_pages);
        setTotalCount(invRes.total);
      }
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดข้อมูลคลังสินค้าได้');
    } finally {
      setLoading(false);
    }
  }, [role, search, categoryId, statusFilter, sortBy, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleActionSuccess = () => {
    loadData();
    if (onRefreshStats) onRefreshStats();
  };

  const renderStockBadge = (item: InventoryItem) => {
    if (item.stock_status === 'inactive') {
      return (
        <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#ECEFF1', color: '#607D8B', fontSize: '11.5px', fontWeight: 600 }}>
          ปิดการขาย
        </span>
      );
    }
    if (item.stock_status === 'out_of_stock') {
      return (
        <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#FFEBEE', color: '#C62828', fontSize: '11.5px', fontWeight: 600 }}>
          หมดสต็อก (0)
        </span>
      );
    }
    if (item.stock_status === 'low_stock') {
      return (
        <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#FFF3E0', color: '#E65100', fontSize: '11.5px', fontWeight: 600 }}>
          ใกล้หมด (≤{item.low_stock_threshold})
        </span>
      );
    }
    return (
      <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#E8F5E9', color: '#2E7D32', fontSize: '11.5px', fontWeight: 600 }}>
        มีสินค้า
      </span>
    );
  };

  return (
    <div className="view-container">
      {/* View Header */}
      <div className="view-header" style={{ marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--ink, #2D3A2F)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Boxes size={24} color="#2D5A27" /> คลังสินค้าและการจัดการสต็อก (Inventory Management)
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#666' }}>
            ตรวจนับ รับเข้า เบิกออก ปรับยอดสต็อกสินค้า และบันทึกประวัติความเคลื่อนไหว (Stock Movement Ledger)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsAllHistoryOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <History size={16} /> ประวัติการเคลื่อนไหว
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsReportsOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FileBarChart size={16} /> รายงานสต็อก
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div style={{ background: '#FFF', padding: '14px', borderRadius: '8px', border: '1px solid #E5DEC9', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', color: '#666' }}>Variants ทั้งหมด</span>
            <Package size={18} color="#2D5A27" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#2D3A2F', marginTop: '4px' }}>
            {summary?.total_variants || 0}
          </div>
          <div style={{ fontSize: '11.5px', color: '#888', marginTop: '2px' }}>
            รวม {summary?.total_units?.toLocaleString() || 0} หน่วยขาย
          </div>
        </div>

        <div style={{ background: '#FFF', padding: '14px', borderRadius: '8px', border: '1px solid #E5DEC9', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', color: '#2E7D32' }}>มีสต็อกปกติ</span>
            <CheckCircle2 size={18} color="#2E7D32" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#2E7D32', marginTop: '4px' }}>
            {summary?.in_stock_count || 0}
          </div>
          <div style={{ fontSize: '11.5px', color: '#888', marginTop: '2px' }}>พร้อมจำหน่าย</div>
        </div>

        <div style={{ background: '#FFF', padding: '14px', borderRadius: '8px', border: '1px solid #E5DEC9', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', color: '#E65100' }}>สินค้าใกล้หมด</span>
            <AlertTriangle size={18} color="#E65100" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#E65100', marginTop: '4px' }}>
            {summary?.low_stock_count || 0}
          </div>
          <div style={{ fontSize: '11.5px', color: '#888', marginTop: '2px' }}>ควรเตรียมสั่งซื้อเพิ่ม</div>
        </div>

        <div style={{ background: '#FFF', padding: '14px', borderRadius: '8px', border: '1px solid #E5DEC9', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', color: '#C62828' }}>หมดสต็อก</span>
            <XCircle size={18} color="#C62828" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#C62828', marginTop: '4px' }}>
            {summary?.out_of_stock_count || 0}
          </div>
          <div style={{ fontSize: '11.5px', color: '#888', marginTop: '2px' }}>ไม่สามารถส่งสินค้าได้</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          background: '#FAF6EE',
          padding: '14px 16px',
          borderRadius: '8px',
          border: '1px solid #E5DEC9',
          marginBottom: '16px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', flex: '1', minWidth: '280px' }}>
          {/* Search */}
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#888' }} />
            <input
              type="text"
              placeholder="ค้นหาชื่อสินค้า, SKU (1 โล)..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{
                width: '100%',
                padding: '7px 10px 7px 32px',
                borderRadius: '6px',
                border: '1px solid #CCC',
                fontSize: '13px',
              }}
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
            style={{
              padding: '7px 10px',
              borderRadius: '6px',
              border: '1px solid #CCC',
              fontSize: '13px',
              background: '#FFF',
            }}
          >
            <option value="">ทุกหมวดหมู่</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Stock Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={15} color="#666" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              style={{
                padding: '7px 10px',
                borderRadius: '6px',
                border: '1px solid #CCC',
                fontSize: '13px',
                background: '#FFF',
              }}
            >
              <option value="all">ทุกสถานะสต็อก</option>
              <option value="in_stock">มีสต็อกปกติ</option>
              <option value="low_stock">ใกล้หมด (Low Stock)</option>
              <option value="out_of_stock">หมดสต็อก (Out of Stock)</option>
              <option value="inactive">ปิดการขาย</option>
            </select>
          </div>

          {/* Sort By */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowUpDown size={15} color="#666" />
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              style={{
                padding: '7px 10px',
                borderRadius: '6px',
                border: '1px solid #CCC',
                fontSize: '13px',
                background: '#FFF',
              }}
            >
              <option value="updated_desc">อัปเดตล่าสุด</option>
              <option value="stock_asc">สต็อกคงเหลือน้อย → มาก</option>
              <option value="stock_desc">สต็อกคงเหลือมาก → น้อย</option>
              <option value="name_asc">ชื่อสินค้า ก-ฮ</option>
              <option value="name_desc">ชื่อสินค้า ฮ-ก</option>
            </select>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={loadData}
            style={{
              padding: '7px 12px',
              borderRadius: '6px',
              border: '1px solid #CCC',
              background: '#FFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
            }}
          >
            <RefreshCw size={14} /> รีเฟรช
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ padding: '12px 16px', background: '#FFEBEE', color: '#C62828', borderRadius: '6px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Inventory Table */}
      <div style={{ background: '#FFF', borderRadius: '8px', border: '1px solid #E5DEC9', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>กำลังโหลดข้อมูลสต็อกสินค้า...</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#888' }}>
            ไม่พบรายการสินค้าตามเงื่อนไขการค้นหา
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ width: '100%', fontSize: '13.5px' }}>
              <thead>
                <tr>
                  <th style={{ width: '60px', textAlign: 'center', padding: '10px' }}>รูปภาพ</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>ชื่อสินค้า</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>หมวดหมู่</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>SKU / หน่วยขาย</th>
                  <th style={{ textAlign: 'right', padding: '10px' }}>คงเหลือ</th>
                  <th style={{ textAlign: 'right', padding: '10px' }}>เกณฑ์แจ้งเตือน</th>
                  <th style={{ textAlign: 'center', padding: '10px' }}>สถานะ</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>เคลื่อนไหวล่าสุด</th>
                  <th style={{ textAlign: 'center', padding: '10px' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.variant_id}>
                    {/* Thumbnail */}
                    <td style={{ textAlign: 'center', padding: '8px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '6px',
                          background: '#F0ECE1',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto',
                        }}
                      >
                        {i.thumbnail_url ? (
                          <img
                            src={i.thumbnail_url}
                            alt={i.product_name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <span style={{ fontSize: '18px' }}>🥑</span>
                        )}
                      </div>
                    </td>

                    {/* Product Name */}
                    <td style={{ padding: '10px' }}>
                      <div style={{ fontWeight: 600, color: '#2D3A2F' }}>{i.product_name}</div>
                      {i.name_en && <div style={{ fontSize: '11.5px', color: '#888' }}>{i.name_en}</div>}
                    </td>

                    {/* Category */}
                    <td style={{ padding: '10px', color: '#666' }}>{i.category_name}</td>

                    {/* SKU (Custom Sales Unit Label) */}
                    <td style={{ padding: '10px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: '#F5F1E8',
                          border: '1px solid #E5DEC9',
                          fontWeight: 600,
                          fontSize: '12px',
                          color: '#2D3A2F',
                        }}
                      >
                        {i.sku}
                      </span>
                    </td>

                    {/* Stock Quantity */}
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: i.stock_quantity <= 0 ? '#C62828' : i.stock_quantity <= i.low_stock_threshold ? '#E65100' : '#2D3A2F',
                        }}
                      >
                        {i.stock_quantity}
                      </span>{' '}
                      <span style={{ fontSize: '12px', color: '#777' }}>{i.unit}</span>
                    </td>

                    {/* Low Stock Threshold */}
                    <td style={{ padding: '10px', textAlign: 'right', color: '#777' }}>
                      {i.low_stock_threshold} {i.unit}
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '10px', textAlign: 'center' }}>{renderStockBadge(i)}</td>

                    {/* Last Movement Date */}
                    <td style={{ padding: '10px', fontSize: '12px', color: '#666', whiteSpace: 'nowrap' }}>
                      {i.last_movement_at
                        ? new Date(i.last_movement_at).toLocaleDateString('th-TH', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedItemForAction(i)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '5px',
                            border: '1px solid #2D5A27',
                            background: '#F4F8F3',
                            color: '#2D5A27',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Sliders size={13} /> จัดการสต็อก
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedItemForHistory(i)}
                          title="ดูประวัติการเคลื่อนไหว"
                          style={{
                            padding: '5px 8px',
                            borderRadius: '5px',
                            border: '1px solid #DDD',
                            background: '#FFF',
                            color: '#666',
                            cursor: 'pointer',
                          }}
                        >
                          <History size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div
          style={{
            padding: '12px 20px',
            background: '#FAF6EE',
            borderTop: '1px solid #E5DEC9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '13px', color: '#666' }}>
            แสดง {items.length} รายการ (ทั้งหมด {totalCount} รายการ)
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #CCC',
                background: page <= 1 ? '#EEE' : '#FFF',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                fontSize: '13px',
              }}
            >
              ก่อนหน้า
            </button>
            <span style={{ fontSize: '13px', color: '#444' }}>
              หน้า {page} / {totalPages || 1}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #CCC',
                background: page >= totalPages ? '#EEE' : '#FFF',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                fontSize: '13px',
              }}
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>

      {/* Stock Action Modal */}
      {selectedItemForAction && (
        <StockActionModal
          item={selectedItemForAction}
          role={role}
          onClose={() => setSelectedItemForAction(null)}
          onSuccess={handleActionSuccess}
        />
      )}

      {/* Stock History Modal (Per Variant) */}
      {selectedItemForHistory && (
        <StockHistoryModal
          role={role}
          variantId={selectedItemForHistory.variant_id}
          productName={selectedItemForHistory.product_name}
          sku={selectedItemForHistory.sku}
          onClose={() => setSelectedItemForHistory(null)}
        />
      )}

      {/* Stock History Modal (All Movements) */}
      {isAllHistoryOpen && (
        <StockHistoryModal
          role={role}
          onClose={() => setIsAllHistoryOpen(false)}
        />
      )}

      {/* Inventory Reports Modal */}
      {isReportsOpen && (
        <InventoryReportsModal
          role={role}
          onClose={() => setIsReportsOpen(false)}
        />
      )}
    </div>
  );
};
