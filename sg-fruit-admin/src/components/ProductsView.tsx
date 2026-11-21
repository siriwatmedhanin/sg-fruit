import React, { useState, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Info,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Star,
  X,
  Link2,
  Check,
} from 'lucide-react';
import type { AuthRole, Category, ProductStatus, ProductVariantRow } from '../types';
import { ProductModal } from './ProductModal';
import {
  updateProductStatus,
  deleteProduct,
  toggleProductFeatured,
  resolveImageUrl,
} from '../services/api';

interface ProductsViewProps {
  products: ProductVariantRow[];
  categories: Category[];
  role: AuthRole;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  categories,
  role,
  loading,
  error,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingProduct, setEditingProduct] = useState<ProductVariantRow | null>(null);

  // Delete Product Confirmation Modal State
  const [deletingProduct, setDeletingProduct] = useState<ProductVariantRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Copy Product Deep Link State
  const [copiedProductId, setCopiedProductId] = useState<string | null>(null);

  const handleCopyProductLink = (productId: string) => {
    const url = `https://sg-fruit.siriwatmedhanin.com/?product=${encodeURIComponent(productId)}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedProductId(productId);
        showToast(`คัดลอกลิงก์สินค้าสำหรับส่งในแชทแล้ว ✓ (${productId})`);
        setTimeout(() => {
          setCopiedProductId((curr) => (curr === productId ? null : curr));
        }, 2000);
      }).catch(() => {
        fallbackCopy(url, productId);
      });
    } else {
      fallbackCopy(url, productId);
    }
  };

  const fallbackCopy = (text: string, productId: string) => {
    try {
      const input = document.createElement('input');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedProductId(productId);
      showToast(`คัดลอกลิงก์สินค้าสำหรับส่งในแชทแล้ว ✓ (${productId})`);
      setTimeout(() => {
        setCopiedProductId((curr) => (curr === productId ? null : curr));
      }, 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Filter products by search term, category, and status
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchesSearch =
        item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.name_en && item.name_en.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.unit && item.unit.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'all' ||
        item.category_name === selectedCategory ||
        item.category_id === selectedCategory;

      const currentStatus = item.status || (item.product_is_active === 1 ? 'active' : 'inactive');
      const matchesStatus = selectedStatus === 'all' || currentStatus === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchTerm, selectedCategory, selectedStatus]);

  const handleOpenAdd = () => {
    setModalMode('add');
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prod: ProductVariantRow) => {
    setModalMode('edit');
    setEditingProduct(prod);
    setIsModalOpen(true);
  };

  const handleStatusChange = async (productId: string, newStatus: ProductStatus) => {
    setActionLoadingId(productId);
    try {
      await updateProductStatus(role, productId, newStatus);
      showToast(`เปลี่ยนสถานะเป็น '${newStatus}' สำเร็จแล้ว`);
      onRefresh();
    } catch (err: any) {
      showToast(`เกิดข้อผิดพลาด: ${err.message || 'ไม่สามารถเปลี่ยนสถานะได้'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleFeatured = async (prod: ProductVariantRow) => {
    setActionLoadingId(prod.product_id);
    const newFeatured = !(prod.is_featured === 1 || prod.is_featured === true);
    try {
      await toggleProductFeatured(role, prod.product_id, newFeatured);
      showToast(`ตั้งค่าสินค้าแนะนำเป็น ${newFeatured ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} แล้ว`);
      onRefresh();
    } catch (err: any) {
      showToast(`เกิดข้อผิดพลาด: ${err.message || 'ไม่สามารถเปลี่ยนสถานะสินค้าแนะนำได้'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProduct || deleteLoading) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await deleteProduct(role, deletingProduct.product_id, deletingProduct.variant_id || undefined);
      if (res.data?.soft_deleted) {
        showToast(`สินค้านี้มีประวัติในระบบ จึงจัดเก็บเข้าคลัง (Archived) เพื่อรักษาข้อมูลทางบัญชี`);
      } else {
        showToast(`ลบข้อมูลสินค้าและรูปภาพทั้งหมดเรียบร้อยแล้ว`);
      }
      setDeletingProduct(null);
      onRefresh();
    } catch (err: any) {
      setDeleteError(err.message || 'ไม่สามารถลบสินค้าได้');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="products-view">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="toast-container">
          <div className="toast-success">
            <CheckCircle2 size={18} />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* DELETE / ARCHIVE PRODUCT CONFIRMATION MODAL */}
      {deletingProduct && (
        <div className="modal-backdrop" onClick={() => !deleteLoading && setDeletingProduct(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header" style={{ borderBottomColor: 'rgba(239, 68, 68, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AlertTriangle size={20} style={{ color: 'var(--red)' }} />
                <h3 className="modal-title" style={{ color: 'var(--red)' }}>
                  ยืนยันการลบหรือจัดเก็บสินค้า
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setDeletingProduct(null)}
                disabled={deleteLoading}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {deleteError && (
                <div className="banner-error" style={{ marginBottom: 0 }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>เกิดข้อผิดพลาดในการลบ:</strong>
                    <p style={{ marginTop: 2 }}>{deleteError}</p>
                  </div>
                </div>
              )}

              <p style={{ fontSize: '14px', lineHeight: 1.6 }}>
                คุณต้องการลบสินค้า <strong>"{deletingProduct.product_name}"</strong> (SKU: <code>{deletingProduct.sku || '-'}</code>) ใช่หรือไม่?
              </p>

              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(44, 95, 45, 0.08)',
                  border: '1px solid rgba(44, 95, 45, 0.2)',
                  fontSize: '12.5px',
                  lineHeight: 1.5,
                  color: 'var(--ink)',
                }}
              >
                🔒 <strong>การรักษาความสมบูรณ์ของข้อมูลทางบัญชี:</strong>
                <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                  <li><strong>หากมีประวัติออเดอร์หรือสต็อก:</strong> ระบบจะทำ <em>Soft Delete (Archived)</em> เพื่อรักษาประวัติการสั่งซื้อ รายงานยอดขาย และสถิติต้นทุน ไม่ให้ข้อมูลสูญหาย</li>
                  <li><strong>หากเป็นสินค้าใหม่ที่ยังไม่มีประวัติ:</strong> ระบบจะทำ <em>Hard Delete</em> ลบข้อมูลและไฟล์รูปภาพใน R2 Storage ทั้งหมดอย่างถาวร</li>
                </ul>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDeletingProduct(null)}
                disabled={deleteLoading}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                style={{ background: 'var(--red)', borderColor: 'var(--red)' }}
              >
                {deleteLoading ? (
                  <>
                    <RefreshCw size={15} className="skeleton" />
                    <span>กำลังดำเนินการ...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>ยืนยันดำเนินการ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL */}
      <ProductModal
        isOpen={isModalOpen}
        mode={modalMode}
        initialData={editingProduct}
        categories={categories}
        role={role}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(msg) => {
          showToast(msg);
          onRefresh();
        }}
      />

      <div className="page-title-row">
        <div>
          <h1 className="page-title">จัดการสินค้า (Product Management)</h1>
          <p className="page-desc">
            เพิ่ม แก้ไข และกำหนดสถานะการจำหน่ายของสินค้าในระบบ SG FRUIT (เชื่อมต่อ Cloudflare D1 จริง)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="nav-item"
            onClick={onRefresh}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#fff',
              border: '1px solid var(--line-strong)',
              padding: '9px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <RefreshCw size={15} className={loading ? 'skeleton' : ''} />
            <span>รีเฟรช</span>
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={handleOpenAdd}
            disabled={role === 'unauthenticated'}
            title={
              role === 'unauthenticated'
                ? 'ไม่มีสิทธิ์เพิ่มสินค้า'
                : 'คลิกเพื่อเปิดหน้าต่างเพิ่มสินค้าใหม่'
            }
          >
            <Plus size={16} />
            <span>เพิ่มสินค้าใหม่</span>
          </button>
        </div>
      </div>

      <div className="banner-info">
        <Info size={18} style={{ color: 'var(--forest)', flexShrink: 0 }} />
        <div>
          <strong>ข้อกำหนด SKU ของ SG FRUIT:</strong> รหัส SKU คือข้อความหน่วยขายที่ผู้ดูแลกรอกเองได้อิสระ
          (เช่น "1 โล", "2 โล", "1 ชุด", "500 กรัม") และ<strong>สามารถซ้ำกันได้ระหว่างสินค้าคนละชนิด</strong> โดยในหน้านี้ Admin
          สามารถเพิ่มและแก้ไขข้อมูลได้จริง และจะบันทึกตรงสู่ฐานข้อมูล D1
        </div>
      </div>

      {error && (
        <div className="banner-error">
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong>เกิดข้อผิดพลาดในการโหลดข้อมูล:</strong> {error}
            <div style={{ marginTop: 4, fontSize: '12px' }}>
              กรุณาตรวจสอบว่า Wrangler dev server กำลังทำงานอยู่ที่พอร์ต 8787
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="table-toolbar" style={{ width: '100%', marginBottom: 0 }}>
            {/* Search Input */}
            <div className="search-input-wrap">
              <Search className="search-icon" />
              <input
                type="search"
                className="search-input"
                placeholder="ค้นหาชื่อสินค้า, ภาษาอังกฤษ, SKU, หน่วยจำหน่าย..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {/* Category Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '12.5px', color: 'var(--muted)', fontWeight: 600 }}>
                  หมวด:
                </span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--line-strong)',
                    background: '#fff',
                    fontSize: '13px',
                    color: 'var(--ink)',
                    outline: 'none',
                  }}
                >
                  <option value="all">ทุกหมวดหมู่ ({products.length} รายการ)</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '12.5px', color: 'var(--muted)', fontWeight: 600 }}>
                  สถานะ:
                </span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--line-strong)',
                    background: '#fff',
                    fontSize: '13px',
                    color: 'var(--ink)',
                    outline: 'none',
                  }}
                >
                  <option value="all">ทุกสถานะ</option>
                  <option value="active">เปิดขาย (Active)</option>
                  <option value="draft">แบบร่าง (Draft)</option>
                  <option value="inactive">ปิดขาย (Inactive)</option>
                  <option value="archived">เก็บเข้าคลัง (Archived)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 45 }}>#</th>
                <th>ชื่อสินค้า (Product Name)</th>
                <th>รหัสขาย (SKU)</th>
                <th>หน่วยจำหน่าย (Unit)</th>
                <th>ราคาขาย (Price)</th>
                <th>ราคาทุน (Cost)</th>
                <th>คงเหลือ (Stock)</th>
                <th style={{ textAlign: 'center', width: 75 }}>แนะนำ</th>
                <th>สถานะ (Status)</th>
                <th style={{ textAlign: 'center', width: 190 }}>การกระทำ (Actions)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <RefreshCw size={18} className="skeleton" />
                      <span>กำลังโหลดข้อมูลสินค้าจาก Cloudflare D1...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '50px 20px' }}>
                    <div className="empty-title">ไม่พบข้อมูลสินค้าที่ตรงกับเงื่อนไข</div>
                    <div className="empty-desc">
                      ลองเปลี่ยนคำค้นหา หรือกดปุ่ม <strong>"เพิ่มสินค้าใหม่"</strong> ด้านบนเพื่อสร้างสินค้าลงในฐานข้อมูล
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((row, index) => {
                  const currentStatus: ProductStatus =
                    row.status || (row.product_is_active === 1 ? 'active' : 'inactive');

                  return (
                    <tr key={`${row.product_id}-${row.variant_id || index}`}>
                      <td style={{ color: 'var(--muted)', fontSize: '12px' }}>{index + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="table-product-thumb">
                            {row.thumbnail_key || row.image_key ? (
                              <img
                                src={resolveImageUrl(row.thumbnail_key || row.image_key)}
                                alt={row.product_name}
                                loading="lazy"
                              />
                            ) : (
                              <span className="table-product-thumb-placeholder">🥑</span>
                            )}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 700, color: 'var(--ink)' }}>
                                {row.product_name}
                              </span>
                              <button
                                type="button"
                                className="btn-action-copy-link"
                                onClick={() => handleCopyProductLink(row.product_id)}
                                title="คัดลอกลิงก์สินค้าสำหรับส่งให้ลูกค้าในแชท"
                              >
                                {copiedProductId === row.product_id ? (
                                  <>
                                    <Check size={11} color="#059669" />
                                    <span style={{ color: '#059669', fontWeight: 600 }}>คัดลอกแล้ว ✓</span>
                                  </>
                                ) : (
                                  <>
                                    <Link2 size={11} />
                                    <span>คัดลอกลิงก์</span>
                                  </>
                                )}
                              </button>
                            </div>
                            {row.name_en && (
                              <div style={{ fontSize: '11px', color: 'var(--forest)', fontStyle: 'italic' }}>
                                {row.name_en}
                              </div>
                            )}
                            {row.category_name && (
                              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                                {row.category_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="sku-badge">{row.sku || 'N/A'}</span>
                      </td>
                      <td>{row.unit || 'ชิ้น'}</td>
                      <td>
                        <strong style={{ color: 'var(--forest-dark)' }}>
                          {row.price !== null ? `฿${row.price.toLocaleString()}` : '-'}
                        </strong>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                          {row.cost_price !== null ? `฿${row.cost_price.toLocaleString()}` : '-'}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            color: (row.stock_quantity ?? 0) > 0 ? 'var(--ink)' : 'var(--red)',
                          }}
                        >
                          {row.stock_quantity !== null ? row.stock_quantity.toLocaleString() : 0}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleFeatured(row)}
                          disabled={role === 'unauthenticated' || actionLoadingId === row.product_id}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: role === 'unauthenticated' ? 'not-allowed' : 'pointer',
                            padding: 4,
                            borderRadius: 4,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: (row.is_featured === 1 || row.is_featured === true) ? '#F59E0B' : 'var(--line-strong)',
                            transition: 'color 0.15s ease',
                          }}
                          title={(row.is_featured === 1 || row.is_featured === true) ? 'สินค้าแนะนำบนหน้าแรก (คลิกเพื่อยกเลิก)' : 'คลิกเพื่อตั้งเป็นสินค้าแนะนำ'}
                        >
                          <Star
                            size={18}
                            fill={(row.is_featured === 1 || row.is_featured === true) ? '#F59E0B' : 'none'}
                          />
                        </button>
                      </td>
                      <td>
                        {currentStatus === 'active' && (
                          <span className="status-badge active">เปิดขาย</span>
                        )}
                        {currentStatus === 'draft' && (
                          <span className="status-badge draft">แบบร่าง</span>
                        )}
                        {currentStatus === 'inactive' && (
                          <span className="status-badge inactive">ปิดขาย</span>
                        )}
                        {currentStatus === 'archived' && (
                          <span className="status-badge archived">เก็บเข้าคลัง</span>
                        )}
                      </td>
                      <td>
                        <div className="row-actions" style={{ justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="btn-action-edit"
                            onClick={() => handleOpenEdit(row)}
                            disabled={role === 'unauthenticated'}
                            title="แก้ไขข้อมูลสินค้า"
                          >
                            <Pencil size={13} />
                            <span>แก้ไข</span>
                          </button>

                          <button
                            type="button"
                            className="btn-action-edit"
                            onClick={() => {
                              setDeleteError(null);
                              setDeletingProduct(row);
                            }}
                            disabled={role === 'unauthenticated'}
                            style={{ color: 'var(--red)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                            title="ลบหรือจัดเก็บสินค้า"
                          >
                            <Trash2 size={13} />
                            <span>ลบ</span>
                          </button>

                          <select
                            className="status-dropdown-quick"
                            value={currentStatus}
                            disabled={
                              role === 'unauthenticated' ||
                              actionLoadingId === row.product_id
                            }
                            onChange={(e) =>
                              handleStatusChange(row.product_id, e.target.value as ProductStatus)
                            }
                            title="เปลี่ยนสถานะสินค้าทันที"
                          >
                            <option value="active">เปิดขาย</option>
                            <option value="draft">แบบร่าง</option>
                            <option value="inactive">ปิดขาย</option>
                            <option value="archived">เก็บเข้าคลัง</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--line)',
            background: 'var(--card-bg-soft)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            color: 'var(--muted)',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <span>
            แสดงผล {filteredProducts.length} จากทั้งหมด {products.length} รายการย่อย
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>ระบบ Product CRUD (Step 3B): บันทึกข้อมูลและสถานะตรงลง Cloudflare D1 Local จริง</span>
          </div>
        </div>
      </div>
    </div>
  );
};
