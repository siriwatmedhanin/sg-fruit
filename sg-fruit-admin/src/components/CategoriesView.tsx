import React, { useState, useMemo } from 'react';
import {
  FolderTree,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
} from 'lucide-react';
import type { AuthRole, Category, CategoryFormData } from '../types';
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from '../services/api';

interface CategoriesViewProps {
  categories: Category[];
  role: AuthRole;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  role,
  loading,
  error,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [sortOrder, setSortOrder] = useState<number | string>(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirmation Modal State
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const filteredCategories = useMemo(() => {
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categories, searchTerm]);

  const handleOpenAdd = () => {
    setModalMode('add');
    setEditingCategory(null);
    setName('');
    setSlug('');
    setSortOrder(categories.length);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setModalMode('edit');
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setSortOrder(cat.sort_order ?? 0);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSlugify = (val: string) => {
    return val
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (modalMode === 'add' && !slug) {
      // Auto-suggest slug for latin letters or keep clean
      const suggested = handleSlugify(val);
      if (suggested) setSlug(suggested);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setFormError(null);
    const trimmedName = name.trim();
    const rawSlug = slug.trim().toLowerCase();
    const numSortOrder = Number(sortOrder);

    if (!trimmedName) {
      setFormError('กรุณาระบุชื่อหมวดหมู่');
      return;
    }
    if (!rawSlug || !/^[a-z0-9-]+$/.test(rawSlug)) {
      setFormError('รูปแบบ slug ไม่ถูกต้อง (ต้องเป็นตัวพิมพ์เล็ก ตัวเลข หรือขีดกลางเท่านั้น เช่น thai-fruits)');
      return;
    }
    if (isNaN(numSortOrder)) {
      setFormError('ลำดับการแสดงผลต้องเป็นตัวเลข');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CategoryFormData = {
        name: trimmedName,
        slug: rawSlug,
        sort_order: numSortOrder,
      };

      if (modalMode === 'add') {
        const res = await createCategory(role, payload);
        showToast(`สร้างหมวดหมู่ '${res.data?.name || trimmedName}' สำเร็จแล้ว`);
      } else if (editingCategory) {
        const res = await updateCategory(role, editingCategory.id, payload);
        showToast(`อัปเดตหมวดหมู่ '${res.data?.name || trimmedName}' สำเร็จแล้ว`);
      }

      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'เกิดข้อผิดพลาดในการบันทึกหมวดหมู่');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingCategory || deleteLoading) return;
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      await deleteCategory(role, deletingCategory.id);
      showToast(`ลบหมวดหมู่ '${deletingCategory.name}' เรียบร้อยแล้ว`);
      setDeletingCategory(null);
      onRefresh();
    } catch (err: any) {
      const isCategoryInUse = err.code === 'CATEGORY_IN_USE' || (err.message && err.message.includes('CATEGORY_IN_USE'));
      if (isCategoryInUse) {
        setDeleteError('ไม่สามารถลบหมวดหมู่นี้ได้เนื่องจากมีสินค้าผูกอยู่กับหมวดหมู่นี้ กรุณาย้ายหรือลบสินค้าก่อน');
      } else {
        setDeleteError(err.message || 'ไม่สามารถลบหมวดหมู่ได้');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="categories-view">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="toast-container">
          <div className="toast-success">
            <CheckCircle2 size={18} />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => !submitting && setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FolderTree size={20} style={{ color: 'var(--forest)' }} />
                <h3 className="modal-title">
                  {modalMode === 'add' ? 'เพิ่มหมวดหมู่สินค้าใหม่' : 'แก้ไขข้อมูลหมวดหมู่'}
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {formError && (
                  <div className="banner-error" style={{ marginBottom: 0 }}>
                    <AlertCircle size={18} style={{ flexShrink: 0 }} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">
                    ชื่อหมวดหมู่ (Category Name) <span style={{ color: 'var(--red)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="เช่น ผลไม้ไทยพรีเมียม, ผลไม้นำเข้า"
                    value={name}
                    onChange={handleNameChange}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Slug (URL Identifier) <span style={{ color: 'var(--red)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="เช่น thai-fruits, imported-fruits"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase())}
                    required
                  />
                  <span style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: 4 }}>
                    ใช้เป็นตัวระบุหมวดหมู่ใน API และ URL (อักษรภาษาอังกฤษตัวพิมพ์เล็ก ตัวเลข และขีดกลางเท่านั้น)
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">ลำดับการแสดงผล (Sort Order)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    min={0}
                  />
                  <span style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: 4 }}>
                    ตัวเลขน้อยจะแสดงก่อนบนแถบเมนูและหน้าเว็บ
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  ยกเลิก
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? (
                    <>
                      <RefreshCw size={15} className="skeleton" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>{modalMode === 'add' ? 'สร้างหมวดหมู่' : 'บันทึกการแก้ไข'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingCategory && (
        <div className="modal-backdrop" onClick={() => !deleteLoading && setDeletingCategory(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header" style={{ borderBottomColor: 'rgba(239, 68, 68, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AlertTriangle size={20} style={{ color: 'var(--red)' }} />
                <h3 className="modal-title" style={{ color: 'var(--red)' }}>
                  ยืนยันการลบหมวดหมู่สินค้า
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setDeletingCategory(null)}
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
                    <strong>ไม่สามารถลบหมวดหมู่ได้:</strong>
                    <p style={{ marginTop: 2 }}>{deleteError}</p>
                  </div>
                </div>
              )}

              <p style={{ fontSize: '14px', lineHeight: 1.6 }}>
                คุณต้องการลบหมวดหมู่ <strong>"{deletingCategory.name}"</strong> (Slug: <code>{deletingCategory.slug}</code>) ใช่หรือไม่?
              </p>

              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  fontSize: '12.5px',
                  color: 'var(--ink)',
                }}
              >
                🔒 <strong>การป้องกันความสมบูรณ์ของข้อมูล:</strong> หากมีสินค้าที่ผูกอยู่กับหมวดหมู่นี้ ระบบจะไม่อนุญาตให้ลบเพื่อป้องกันข้อมูลสินค้าสูญหาย (Relational Integrity Protection)
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDeletingCategory(null)}
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
                    <span>กำลังตรวจสอบและลบ...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>ยืนยันลบหมวดหมู่</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="page-title-row">
        <div>
          <h1 className="page-title">จัดการหมวดหมู่สินค้า (Category Management)</h1>
          <p className="page-desc">
            สร้าง แก้ไข และจัดเรียงหมวดหมู่สินค้าสำหรับจัดระเบียบสินค้าและแสดงผลบน Storefront
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
            title={role === 'unauthenticated' ? 'ไม่มีสิทธิ์เพิ่มหมวดหมู่' : 'คลิกเพื่อสร้างหมวดหมู่ใหม่'}
          >
            <Plus size={16} />
            <span>เพิ่มหมวดหมู่ใหม่</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="banner-error">
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong>เกิดข้อผิดพลาดในการโหลดข้อมูล:</strong> {error}
          </div>
        </div>
      )}

      {/* TABLE CARD */}
      <div className="card">
        <div className="card-header">
          <div className="table-toolbar" style={{ width: '100%', marginBottom: 0 }}>
            <div className="search-input-wrap">
              <Search className="search-icon" />
              <input
                type="search"
                className="search-input"
                placeholder="ค้นหาชื่อหมวดหมู่ หรือ Slug..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>ลำดับ</th>
                <th>ชื่อหมวดหมู่ (Category Name)</th>
                <th>Slug (URL Identifier)</th>
                <th style={{ width: 140 }}>ลำดับการแสดง (Sort)</th>
                <th style={{ textAlign: 'center', width: 160 }}>การกระทำ (Actions)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <RefreshCw size={18} className="skeleton" />
                      <span>กำลังโหลดหมวดหมู่จาก Cloudflare D1...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '50px 20px' }}>
                    <div className="empty-title">ไม่พบหมวดหมู่สินค้า</div>
                    <div className="empty-desc">
                      กดปุ่ม <strong>"เพิ่มหมวดหมู่ใหม่"</strong> ด้านบนเพื่อสร้างหมวดหมู่ในระบบ D1
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat, index) => (
                  <tr key={cat.id}>
                    <td style={{ color: 'var(--muted)', fontSize: '12px' }}>{index + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FolderTree size={16} style={{ color: 'var(--forest)' }} />
                        <strong style={{ color: 'var(--ink)' }}>{cat.name}</strong>
                      </div>
                    </td>
                    <td>
                      <span className="sku-badge" style={{ background: 'rgba(44, 95, 45, 0.08)', color: 'var(--forest-dark)' }}>
                        {cat.slug}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--muted)' }}>
                        {cat.sort_order ?? 0}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions" style={{ justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="btn-action-edit"
                          onClick={() => handleOpenEdit(cat)}
                          disabled={role === 'unauthenticated'}
                          title="แก้ไขหมวดหมู่"
                        >
                          <Pencil size={13} />
                          <span>แก้ไข</span>
                        </button>
                        <button
                          type="button"
                          className="btn-action-edit"
                          onClick={() => {
                            setDeleteError(null);
                            setDeletingCategory(cat);
                          }}
                          disabled={role === 'unauthenticated'}
                          style={{ color: 'var(--red)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                          title="ลบหมวดหมู่"
                        >
                          <Trash2 size={13} />
                          <span>ลบ</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--line)',
            background: 'var(--card-bg-soft)',
            fontSize: '12px',
            color: 'var(--muted)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <span>แสดง {filteredCategories.length} จากทั้งหมด {categories.length} หมวดหมู่</span>
          <span>Cloudflare D1 categories table (CRUD พร้อม Relational Protection)</span>
        </div>
      </div>
    </div>
  );
};
