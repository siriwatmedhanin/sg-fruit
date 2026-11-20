import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  AlertCircle,
  CheckCircle2,
  FileText,
  EyeOff,
  Archive,
  Save,
  RefreshCw,
  Star,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Plus,
  Image as ImageIcon,
} from 'lucide-react';
import type {
  ProductVariantRow,
  Category,
  AuthRole,
  ProductFormData,
  ProductStatus,
} from '../types';
import {
  createProduct,
  updateProduct,
  fetchProductImages,
  addGalleryImage,
  replaceGalleryImage,
  deleteGalleryImage,
  reorderGalleryImages,
  resolveImageUrl,
} from '../services/api';
import {
  processImageOptimization,
  type OptimizationBundle,
} from '../utils/imageOptimizer';

interface ProductModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  initialData?: ProductVariantRow | null;
  categories: Category[];
  role: AuthRole;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export interface GalleryItem {
  id: string; // backend image id or temp client id
  isPersisted: boolean;
  isReplaced?: boolean;
  imageUrl: string;
  thumbnailUrl: string;
  isPrimary: boolean;
  bundle?: OptimizationBundle;
  originalName?: string;
  originalSize?: number;
  compressedSize?: number;
  reductionPercent?: number;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  mode,
  initialData,
  categories,
  role,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState('กิโลกรัม');
  const [price, setPrice] = useState<number | string>(100);
  const [costPrice, setCostPrice] = useState<number | string>(60);
  const [stockQuantity, setStockQuantity] = useState<number | string>(20);
  const [status, setStatus] = useState<ProductStatus>('active');

  // Product Gallery State (Max 5 Images)
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizingText, setOptimizingText] = useState('');
  const [imageError, setImageError] = useState<string | null>(null);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const isSubmittingRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dev mode flag for automated test harness (strictly restricted to local DEV environment AND ?dev_mode=1)
  const isDevMode = Boolean(import.meta.env.DEV) && typeof window !== 'undefined' && window.location.search.includes('dev_mode=1');

  // Populate or reset form on open/change
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setImageError(null);
      setDeletedImageIds([]);
      setReplacingIndex(null);
      setCreatedProductId(null);

      if (mode === 'edit' && initialData) {
        setName(initialData.product_name || '');
        setNameEn(initialData.name_en || '');
        setCategoryId(initialData.category_id || (categories[0]?.id ?? 'cat-thai'));
        setDescription(initialData.description || '');
        setSku(initialData.sku || '');
        setUnit(initialData.unit || 'กิโลกรัม');
        setPrice(initialData.price ?? 0);
        setCostPrice(initialData.cost_price ?? 0);
        setStockQuantity(initialData.stock_quantity ?? 0);
        setStatus(initialData.status || (initialData.product_is_active === 1 ? 'active' : 'inactive'));

        // Load existing gallery images from backend
        loadProductImages(initialData.product_id);
      } else {
        // Reset for Add
        setName('');
        setNameEn('');
        setCategoryId(categories[0]?.id ?? 'cat-thai');
        setDescription('');
        setSku('1 โล');
        setUnit('กิโลกรัม');
        setPrice(120);
        setCostPrice(75);
        setStockQuantity(25);
        setStatus('active');
        setGalleryItems([]);
      }
    }
  }, [isOpen, mode, initialData, categories]);

  // Fetch images from backend for existing product
  const loadProductImages = async (productId: string) => {
    try {
      const res = await fetchProductImages(role, productId);
      if (res.ok && res.data && res.data.length > 0) {
        const loaded: GalleryItem[] = res.data.map((img) => ({
          id: img.id,
          isPersisted: true,
          imageUrl: resolveImageUrl(img.image_url),
          thumbnailUrl: resolveImageUrl(img.thumbnail_url),
          isPrimary: img.is_primary,
          originalName: img.image_meta ? tryParseMetaName(img.image_meta) : undefined,
        }));
        setGalleryItems(loaded);
      } else if (initialData?.thumbnail_key || initialData?.image_key) {
        // Fallback to legacy single image if product_images not yet backfilled
        const key = initialData.thumbnail_key || initialData.image_key;
        setGalleryItems([
          {
            id: 'legacy-img',
            isPersisted: true,
            imageUrl: resolveImageUrl(initialData.image_key || key),
            thumbnailUrl: resolveImageUrl(key),
            isPrimary: true,
            originalName: 'รูปภาพเดิมของสินค้า',
          },
        ]);
      } else {
        setGalleryItems([]);
      }
    } catch (err: any) {
      console.warn('Failed to load gallery images:', err);
      if (initialData?.thumbnail_key || initialData?.image_key) {
        const key = initialData.thumbnail_key || initialData.image_key;
        setGalleryItems([
          {
            id: 'legacy-img',
            isPersisted: true,
            imageUrl: `/api/images/${initialData.image_key || key}`,
            thumbnailUrl: `/api/images/${key}`,
            isPrimary: true,
          },
        ]);
      }
    }
  };

  const tryParseMetaName = (metaStr: string): string => {
    try {
      const p = JSON.parse(metaStr);
      return p.originalName || 'รูปภาพสินค้า';
    } catch {
      return 'รูปภาพสินค้า';
    }
  };

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      galleryItems.forEach((item) => {
        if (item.bundle) {
          try {
            URL.revokeObjectURL(item.bundle.main.url);
            URL.revokeObjectURL(item.bundle.thumbnail.url);
            URL.revokeObjectURL(item.bundle.original.url);
          } catch {}
        }
      });
    };
  }, [galleryItems]);

  if (!isOpen) return null;

  // Process files sequentially to avoid high memory spikes when multiple large images are added
  const handleAddFiles = async (files: File[]) => {
    setImageError(null);
    const remainingSlots = 5 - galleryItems.length;

    if (remainingSlots <= 0) {
      setImageError('สินค้ามีรูปภาพครบ 5 รูปแล้ว ไม่สามารถเพิ่มรูปได้อีก');
      return;
    }

    if (files.length > remainingSlots) {
      setImageError(`สามารถเพิ่มรูปภาพได้อีก ${remainingSlots} รูปเท่านั้น (เลือกมา ${files.length} รูป ระบบจะประมวลผลเฉพาะ ${remainingSlots} รูปแรก)`);
    }

    const filesToProcess = files.slice(0, remainingSlots);
    setOptimizing(true);

    try {
      const newItems: GalleryItem[] = [];

      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
        setOptimizingText(`กำลังปรับขนาดและบีบอัดรูปภาพ ${i + 1}/${filesToProcess.length}: ${file.name}...`);

        const bundle = await processImageOptimization(file, {
          mainQuality: 0.85,
          thumbQuality: 0.82,
        });

        const isFirst = galleryItems.length === 0 && newItems.length === 0;

        newItems.push({
          id: 'temp-' + crypto.randomUUID().slice(0, 8),
          isPersisted: false,
          imageUrl: bundle.main.url,
          thumbnailUrl: bundle.thumbnail.url,
          isPrimary: isFirst,
          bundle,
          originalName: bundle.original.name,
          originalSize: bundle.original.sizeBytes,
          compressedSize: bundle.main.sizeBytes,
          reductionPercent: Math.round(((bundle.main.sizeBytes - bundle.original.sizeBytes) / bundle.original.sizeBytes) * 100),
        });
      }

      setGalleryItems((prev) => [...prev, ...newItems]);
    } catch (err: any) {
      setImageError(err.message || 'เกิดข้อผิดพลาดในการประมวลผลรูปภาพ');
    } finally {
      setOptimizing(false);
      setOptimizingText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleAddFiles(Array.from(e.target.files));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  // Replace a specific slot
  const handleTriggerReplace = (index: number) => {
    setReplacingIndex(index);
    replaceInputRef.current?.click();
  };

  const handleReplaceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (replacingIndex === null || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setImageError(null);
    setOptimizing(true);
    setOptimizingText(`กำลังเปลี่ยนรูปภาพ: ${file.name}...`);

    try {
      const bundle = await processImageOptimization(file, {
        mainQuality: 0.85,
        thumbQuality: 0.82,
      });

      setGalleryItems((prev) => {
        const next = [...prev];
        const current = next[replacingIndex];
        if (!current) return prev;

        if (current.bundle) {
          try {
            URL.revokeObjectURL(current.bundle.main.url);
            URL.revokeObjectURL(current.bundle.thumbnail.url);
          } catch {}
        }

        next[replacingIndex] = {
          ...current,
          isReplaced: true,
          imageUrl: bundle.main.url,
          thumbnailUrl: bundle.thumbnail.url,
          bundle,
          originalName: bundle.original.name,
          originalSize: bundle.original.sizeBytes,
          compressedSize: bundle.main.sizeBytes,
          reductionPercent: Math.round(((bundle.main.sizeBytes - bundle.original.sizeBytes) / bundle.original.sizeBytes) * 100),
        };
        return next;
      });
    } catch (err: any) {
      setImageError(err.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรูปภาพ');
    } finally {
      setOptimizing(false);
      setOptimizingText('');
      setReplacingIndex(null);
      if (replaceInputRef.current) replaceInputRef.current.value = '';
    }
  };

  // Delete a specific slot
  const handleDeleteSlot = (index: number) => {
    setImageError(null);
    setGalleryItems((prev) => {
      const next = [...prev];
      const target = next[index];
      if (!target) return prev;

      if (target.isPersisted && !target.id.startsWith('temp-') && target.id !== 'legacy-img') {
        setDeletedImageIds((d) => [...d, target.id]);
      }

      if (target.bundle) {
        try {
          URL.revokeObjectURL(target.bundle.main.url);
          URL.revokeObjectURL(target.bundle.thumbnail.url);
        } catch {}
      }

      next.splice(index, 1);

      // If deleted image was primary, auto-elect the first remaining image
      if (target.isPrimary && next.length > 0) {
        next[0] = { ...next[0], isPrimary: true };
      }

      return next;
    });
  };

  // Set an image as primary
  const handleSetPrimary = (index: number) => {
    setGalleryItems((prev) =>
      prev.map((item, i) => ({
        ...item,
        isPrimary: i === index,
      }))
    );
  };

  // Reorder: Move left or right
  const handleMoveSlot = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= galleryItems.length) return;

    setGalleryItems((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  // Dev mode helpers
  const handleLoadDevSample = async (filename: string) => {
    try {
      const res = await fetch(`/test-images/${filename}`);
      if (!res.ok) throw new Error(`ไม่พบไฟล์ทดสอบ: ${filename}`);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: blob.type || 'image/png' });
      await handleAddFiles([file]);
    } catch (err: any) {
      setImageError(err.message || 'โหลดรูปตัวอย่างไม่สำเร็จ');
    }
  };

  const handleLoadMultipleDevSamples = async (count: number) => {
    const sampleNames = [
      'sample_transparent_avocado.png',
      'sample_normal.jpg',
      'sample_small_300px.png',
      'sample_portrait_stem.png',
      'sample_square_logo.png',
    ];
    try {
      const files: File[] = [];
      for (let i = 0; i < Math.min(count, sampleNames.length); i++) {
        const name = sampleNames[i];
        const res = await fetch(`/test-images/${name}`);
        if (res.ok) {
          const blob = await res.blob();
          files.push(new File([blob], name, { type: blob.type || 'image/png' }));
        }
      }
      await handleAddFiles(files);
    } catch (err: any) {
      setImageError(err.message || 'โหลดรูปตัวอย่างไม่สำเร็จ');
    }
  };

  const handleClearAllImages = () => {
    galleryItems.forEach((item) => {
      if (item.isPersisted && !item.id.startsWith('temp-') && item.id !== 'legacy-img') {
        setDeletedImageIds((d) => [...d, item.id]);
      }
      if (item.bundle) {
        try {
          URL.revokeObjectURL(item.bundle.main.url);
          URL.revokeObjectURL(item.bundle.thumbnail.url);
        } catch {}
      }
    });
    setGalleryItems([]);
  };

  const handleSubmit = async (submitStatus?: ProductStatus) => {
    if (isSubmittingRef.current || loading || optimizing) return;
    setError(null);

    const finalStatus = submitStatus || status;
    const trimmedName = name.trim();
    const trimmedSku = sku.trim();
    const trimmedUnit = unit.trim();
    const numPrice = Number(price);
    const numCost = Number(costPrice);
    const numStock = Number(stockQuantity);

    // Client Validation
    if (!trimmedName) {
      setError('กรุณาระบุชื่อสินค้า');
      return;
    }
    if (!categoryId) {
      setError('กรุณาเลือกหมวดหมู่สินค้า');
      return;
    }
    if (!trimmedSku) {
      setError('กรุณาระบุรหัสหน่วยขาย (SKU)');
      return;
    }
    if (!trimmedUnit) {
      setError('กรุณาระบุหน่วยจำหน่าย');
      return;
    }
    if (isNaN(numPrice) || numPrice < 0) {
      setError('ราคาขายต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0');
      return;
    }
    if (isNaN(numStock) || numStock < 0) {
      setError('จำนวนสต็อกต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0');
      return;
    }

    const payload: ProductFormData = {
      name: trimmedName,
      name_en: nameEn.trim() || undefined,
      category_id: categoryId,
      description: description.trim() || undefined,
      sku: trimmedSku,
      unit: trimmedUnit,
      price: numPrice,
      cost_price: isNaN(numCost) ? 0 : numCost,
      stock_quantity: numStock,
      status: finalStatus,
      variant_id: initialData?.variant_id || undefined,
    };

    isSubmittingRef.current = true;
    setLoading(true);
    try {
      let savedProductId = createdProductId || initialData?.product_id;

      // 1. Create or Update Product in D1
      if (mode === 'edit') {
        if (!initialData?.product_id) {
          throw new Error('ไม่พบรหัสสินค้าที่ต้องการแก้ไข');
        }
        // STRICTLY updateProduct ONLY, NEVER createProduct in edit mode
        const res = await updateProduct(role, initialData.product_id, payload);
        if (res.data?.product_id) {
          savedProductId = res.data.product_id;
        } else {
          savedProductId = initialData.product_id;
        }
      } else {
        // mode === 'add'
        if (!createdProductId) {
          const res = await createProduct(role, payload);
          savedProductId = res.data?.product_id;
          setCreatedProductId(savedProductId || null);
        } else {
          await updateProduct(role, createdProductId, payload);
          savedProductId = createdProductId;
        }
      }

      if (!savedProductId) {
        throw new Error('ไม่สามารถบันทึกข้อมูลสินค้าได้');
      }

      // 2. Process Gallery Operations for savedProductId
      try {
        // 2.1 Delete queued deletions
        for (const delId of deletedImageIds) {
          try {
            await deleteGalleryImage(role, savedProductId, delId);
          } catch (delErr) {
            console.warn(`Delete image ${delId} warning:`, delErr);
          }
        }

        // 2.2 Upload new images & handle replacements
        const finalImageIds: string[] = [];
        let finalPrimaryId: string | undefined = undefined;

        for (let i = 0; i < galleryItems.length; i++) {
          const item = galleryItems[i];

          if (!item.isPersisted && item.bundle) {
            // New upload
            const meta = {
              originalName: item.bundle.original.name,
              originalSize: item.bundle.original.sizeBytes,
              mainDims: { width: item.bundle.main.width, height: item.bundle.main.height },
              thumbDims: { width: item.bundle.thumbnail.width, height: item.bundle.thumbnail.height },
              optimizedAt: new Date().toISOString(),
            };
            const uploadRes = await addGalleryImage(
              role,
              savedProductId,
              item.bundle.main.blob,
              item.bundle.thumbnail.blob,
              meta,
              item.isPrimary,
              i
            );
            const newId = uploadRes.data.id;
            finalImageIds.push(newId);
            if (item.isPrimary) finalPrimaryId = newId;
          } else if (item.isPersisted && item.isReplaced && item.bundle && !item.id.startsWith('temp-') && item.id !== 'legacy-img') {
            // Replaced existing image
            const meta = {
              originalName: item.bundle.original.name,
              originalSize: item.bundle.original.sizeBytes,
              mainDims: { width: item.bundle.main.width, height: item.bundle.main.height },
              thumbDims: { width: item.bundle.thumbnail.width, height: item.bundle.thumbnail.height },
              replacedAt: new Date().toISOString(),
            };
            await replaceGalleryImage(
              role,
              savedProductId,
              item.id,
              item.bundle.main.blob,
              item.bundle.thumbnail.blob,
              meta
            );
            finalImageIds.push(item.id);
            if (item.isPrimary) finalPrimaryId = item.id;
          } else {
            // Unchanged persisted image
            finalImageIds.push(item.id);
            if (item.isPrimary) finalPrimaryId = item.id;
          }
        }

        // 2.3 Reorder & sync primary image if images exist
        if (finalImageIds.length > 0) {
          try {
            await reorderGalleryImages(role, savedProductId, finalImageIds, finalPrimaryId || finalImageIds[0]);
          } catch (reorderErr) {
            console.warn('Reorder warning:', reorderErr);
          }
        }
      } catch (galleryErr: any) {
        setError(`บันทึกข้อมูลสินค้าลงระบบแล้ว (ID: ${savedProductId}) แต่เกิดข้อผิดพลาดในการจัดการรูปภาพแกลเลอรี: ${galleryErr.message} (สามารถกดปุ่มบันทึกอีกครั้งเพื่อลองใหม่)`);
        isSubmittingRef.current = false;
        setLoading(false);
        return;
      }

      onSuccess(mode === 'add' ? 'เพิ่มสินค้าและบันทึกรูปภาพแกลเลอรีเรียบร้อยแล้ว' : 'บันทึกการแก้ไขสินค้าเรียบร้อยแล้ว');
      onClose();
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop-custom" role="dialog" aria-modal="true">
      <div className="modal-dialog-custom">
        <div className="modal-header-custom">
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>
              {mode === 'add' ? 'เพิ่มสินค้าใหม่ (Add Product)' : `แก้ไขสินค้า: ${initialData?.product_name || ''}`}
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
              {mode === 'add'
                ? 'กรอกข้อมูลสินค้าและอัปโหลดรูปภาพแกลเลอรี (สูงสุด 5 รูป) ระบบจะปรับขนาดและแปลงเป็น WebP ให้อัตโนมัติ'
                : `รหัสสินค้า: ${initialData?.product_id || ''} · รหัสตัวเลือก: ${initialData?.variant_id || ''}`}
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn-custom"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
            disabled={loading || optimizing}
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body-custom">
          {error && (
            <div className="banner-error" style={{ marginBottom: 16 }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>
                <strong>พบข้อผิดพลาด:</strong> {error}
              </div>
            </div>
          )}

          <div className="form-grid">
            {/* 1. Name */}
            <div className="form-group span-2">
              <label className="form-label required">ชื่อสินค้า (ภาษาไทย)</label>
              <input
                type="text"
                className="form-input"
                placeholder="เช่น อะโวคาโดฮาส, มะม่วงน้ำดอกไม้, เสาวรสหวาน"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* 2. English Name */}
            <div className="form-group span-2">
              <label className="form-label">ชื่อภาษาอังกฤษ (ไม่บังคับ)</label>
              <input
                type="text"
                className="form-input"
                placeholder="เช่น Hass Avocado, Golden Mango, Passionfruit"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* 3. Category */}
            <div className="form-group">
              <label className="form-label required">หมวดหมู่สินค้า</label>
              <select
                className="form-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={loading}
              >
                {categories.length > 0 ? (
                  categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="cat-thai">ผลไม้ไทย</option>
                    <option value="cat-imported">ผลไม้นำเข้า</option>
                    <option value="cat-seasonal">ผลไม้ตามฤดูกาล</option>
                    <option value="cat-veg">ผักสด</option>
                  </>
                )}
              </select>
            </div>

            {/* 4. SKU */}
            <div className="form-group">
              <label className="form-label required">
                รหัสขาย (SKU) <span className="label-badge-sku">ข้อความอิสระ / ซ้ำกันได้</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="เช่น 1 โล, 2 โล, 1 ชุด, 1 แท่ง, 500 กรัม"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                disabled={loading}
              />
              <span className="form-hint">SG FRUIT ใช้รหัสหน่วยขายที่ผู้ดูแลระบุเองได้อิสระ</span>
            </div>

            {/* 5. Selling Unit */}
            <div className="form-group">
              <label className="form-label required">หน่วยจำหน่าย (Selling Unit)</label>
              <input
                type="text"
                className="form-input"
                placeholder="เช่น กิโลกรัม, 2 ลูก, แพ็ก, หวี, กล่อง"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* 6. Selling Price */}
            <div className="form-group">
              <label className="form-label required">ราคาขาย (บาท)</label>
              <input
                type="number"
                min="0"
                step="1"
                className="form-input"
                placeholder="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* 7. Cost Price */}
            <div className="form-group">
              <label className="form-label">
                ราคาทุน (บาท) <span className="label-badge-admin">Admin Only</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                className="form-input"
                placeholder="0"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                disabled={loading}
              />
              <span className="form-hint">ข้อมูลนี้จะถูกซ่อนจาก Public API เสมอ</span>
            </div>

            {/* 8. Stock Quantity */}
            <div className="form-group">
              <label className="form-label required">จำนวนสต็อกสินค้า</label>
              <input
                type="number"
                min="0"
                step="1"
                className="form-input"
                placeholder="0"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* 9. Status Selector */}
            <div className="form-group span-2">
              <label className="form-label required">สถานะสินค้า (Product Status)</label>
              <div className="status-radio-group">
                <label className={`status-radio-card ${status === 'active' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="status"
                    value="active"
                    checked={status === 'active'}
                    onChange={() => setStatus('active')}
                    disabled={loading}
                  />
                  <CheckCircle2 size={16} className="text-sage" />
                  <div>
                    <strong>เปิดขาย (Active)</strong>
                    <p>แสดงหน้าร้านและพร้อมจำหน่าย</p>
                  </div>
                </label>

                <label className={`status-radio-card ${status === 'draft' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="status"
                    value="draft"
                    checked={status === 'draft'}
                    onChange={() => setStatus('draft')}
                    disabled={loading}
                  />
                  <FileText size={16} className="text-amber" />
                  <div>
                    <strong>แบบร่าง (Draft)</strong>
                    <p>บันทึกเตรียมไว้ ยังไม่เปิดขาย</p>
                  </div>
                </label>

                <label className={`status-radio-card ${status === 'inactive' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="status"
                    value="inactive"
                    checked={status === 'inactive'}
                    onChange={() => setStatus('inactive')}
                    disabled={loading}
                  />
                  <EyeOff size={16} className="text-muted" />
                  <div>
                    <strong>ปิดขาย (Inactive)</strong>
                    <p>ซ่อนจากหน้าร้านชั่วคราว</p>
                  </div>
                </label>

                <label className={`status-radio-card ${status === 'archived' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="status"
                    value="archived"
                    checked={status === 'archived'}
                    onChange={() => setStatus('archived')}
                    disabled={loading}
                  />
                  <Archive size={16} className="text-wood" />
                  <div>
                    <strong>เก็บเข้าคลัง (Archive)</strong>
                    <p>ยกเลิกจำหน่าย (ไม่ลบถาวร)</p>
                  </div>
                </label>
              </div>
            </div>

            {/* 10. PRODUCT GALLERY SECTION (MAX 5 IMAGES) */}
            <div className="form-group span-2" data-testid="product-gallery-section">
              <div className="gallery-section-header">
                <label className="form-label" style={{ marginBottom: 0 }}>
                  รูปภาพสินค้า (สูงสุด 5 รูป)
                </label>
                <span className={`gallery-count-badge ${galleryItems.length >= 5 ? 'is-full' : ''}`} data-testid="gallery-count-badge">
                  {galleryItems.length}/5 รูป
                </span>
              </div>

              {/* Hidden Inputs for File Selection */}
              <input
                type="file"
                ref={fileInputRef}
                data-testid="gallery-file-input"
                multiple
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
                disabled={loading || optimizing || galleryItems.length >= 5}
              />
              <input
                type="file"
                ref={replaceInputRef}
                data-testid="gallery-replace-input"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleReplaceFileChange}
                disabled={loading || optimizing}
              />

              {/* 5-Slot Gallery Grid */}
              <div className="product-gallery-grid" data-testid="product-gallery-grid">
                {[0, 1, 2, 3, 4].map((index) => {
                  const item = galleryItems[index];

                  if (item) {
                    return (
                      <div
                        key={item.id || index}
                        className={`gallery-slot ${item.isPrimary ? 'is-primary' : ''}`}
                        data-testid={`gallery-slot-${index}`}
                      >
                        {/* Position Tag */}
                        <span className="gallery-slot-order-tag">#{index + 1}</span>

                        {/* Primary Badge */}
                        {item.isPrimary && (
                          <span className="gallery-primary-pill" data-testid={`gallery-primary-badge-${index}`}>
                            <Star size={10} fill="#ffffff" />
                            รูปหลัก
                          </span>
                        )}

                        {/* Image Preview */}
                        <div className="gallery-slot-thumb">
                          <img src={item.thumbnailUrl} alt={item.originalName || `รูปที่ ${index + 1}`} />
                        </div>

                        {/* Controls Bar */}
                        <div className="gallery-slot-controls">
                          {/* Set Primary Button */}
                          <button
                            type="button"
                            className={`gallery-btn-control ${item.isPrimary ? 'primary-star' : ''}`}
                            data-testid={`btn-set-primary-${index}`}
                            title={item.isPrimary ? 'รูปหลัก' : 'กำหนดเป็นรูปหลัก'}
                            aria-label={`กำหนดรูปที่ ${index + 1} เป็นรูปหลัก`}
                            onClick={() => handleSetPrimary(index)}
                            disabled={item.isPrimary || loading || optimizing}
                          >
                            <Star size={13} fill={item.isPrimary ? '#d97706' : 'none'} />
                          </button>

                          {/* Move Left */}
                          <button
                            type="button"
                            className="gallery-btn-control"
                            data-testid={`btn-move-left-${index}`}
                            title="เลื่อนไปซ้าย"
                            aria-label={`เลื่อนรูปที่ ${index + 1} ไปซ้าย`}
                            onClick={() => handleMoveSlot(index, 'left')}
                            disabled={index === 0 || loading || optimizing}
                          >
                            <ArrowLeft size={13} />
                          </button>

                          {/* Move Right */}
                          <button
                            type="button"
                            className="gallery-btn-control"
                            data-testid={`btn-move-right-${index}`}
                            title="เลื่อนไปขวา"
                            aria-label={`เลื่อนรูปที่ ${index + 1} ไปขวา`}
                            onClick={() => handleMoveSlot(index, 'right')}
                            disabled={index === galleryItems.length - 1 || loading || optimizing}
                          >
                            <ArrowRight size={13} />
                          </button>

                          {/* Replace Button */}
                          <button
                            type="button"
                            className="gallery-btn-control"
                            data-testid={`btn-replace-image-${index}`}
                            title="เปลี่ยนรูปนี้"
                            aria-label={`เปลี่ยนรูปที่ ${index + 1}`}
                            onClick={() => handleTriggerReplace(index)}
                            disabled={loading || optimizing}
                          >
                            <RefreshCw size={12} />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            className="gallery-btn-control delete"
                            data-testid={`btn-delete-slot-${index}`}
                            title="ลบรูปนี้"
                            aria-label={`ลบรูปที่ ${index + 1}`}
                            onClick={() => handleDeleteSlot(index)}
                            disabled={loading || optimizing}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // Empty Slot (clickable if next available slot)
                  const isNextSlot = index === galleryItems.length;
                  return (
                    <div
                      key={`empty-${index}`}
                      className={`gallery-slot is-empty ${!isNextSlot ? 'disabled' : ''}`}
                      data-testid={`gallery-empty-slot-${index}`}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={isNextSlot ? handleDrop : undefined}
                      onClick={() => {
                        if (isNextSlot && !loading && !optimizing) {
                          fileInputRef.current?.click();
                        }
                      }}
                    >
                      {isNextSlot ? (
                        <>
                          <Plus size={20} />
                          <span style={{ fontSize: '11px', fontWeight: 700 }}>เพิ่มรูป</span>
                          <span style={{ fontSize: '9.5px', color: 'var(--muted)' }}>#{index + 1}</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon size={18} opacity={0.3} />
                          <span style={{ fontSize: '9.5px', color: 'var(--muted)' }}>ช่องที่ #{index + 1}</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Optimizing Progress Banner */}
              {optimizing && (
                <div className="gallery-summary-card" data-testid="gallery-optimizing-indicator">
                  <div style={{ display: 'flex', alignContent: 'center', alignItems: 'center', gap: 8 }}>
                    <RefreshCw size={15} className="skeleton" style={{ color: 'var(--forest)' }} />
                    <span style={{ fontWeight: 600 }}>{optimizingText || 'กำลังประมวลผลรูปภาพอัตโนมัติ (WebP 1600px/480px)...'}</span>
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {imageError && (
                <div className="banner-error" style={{ marginTop: '6px' }} data-testid="gallery-error-banner">
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: '12px' }}>{imageError}</div>
                </div>
              )}

              {/* Dev Mode Test Suite */}
              {isDevMode && (
                <div className="dev-test-suite" data-testid="dev-test-suite" style={{ marginTop: 8 }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)' }}>
                    🧪 Gallery Dev Test:
                  </span>
                  <button
                    type="button"
                    className="sample-test-btn"
                    data-testid="dev-load-single"
                    onClick={() => handleLoadDevSample('sample_transparent_avocado.png')}
                    disabled={loading || optimizing || galleryItems.length >= 5}
                  >
                    🥑 ใส่ 1 รูป (Avocado)
                  </button>
                  <button
                    type="button"
                    className="sample-test-btn"
                    data-testid="dev-load-3-samples"
                    onClick={() => handleLoadMultipleDevSamples(3)}
                    disabled={loading || optimizing || galleryItems.length >= 3}
                  >
                    📸 ใส่ 3 รูป
                  </button>
                  <button
                    type="button"
                    className="sample-test-btn"
                    data-testid="dev-load-5-samples"
                    onClick={() => handleLoadMultipleDevSamples(5)}
                    disabled={loading || optimizing || galleryItems.length > 0}
                  >
                    ⚡ ใส่เต็ม 5 รูป
                  </button>
                  <button
                    type="button"
                    className="sample-test-btn"
                    data-testid="dev-load-highres"
                    onClick={() => handleLoadDevSample('sample_highres.jpg')}
                    disabled={loading || optimizing || galleryItems.length >= 5}
                  >
                    🚀 ภาพใหญ่ 21MB
                  </button>
                  {galleryItems.length > 0 && (
                    <button
                      type="button"
                      className="sample-test-btn"
                      style={{ color: 'var(--red)', borderColor: '#fca5a5' }}
                      data-testid="dev-clear-gallery"
                      onClick={handleClearAllImages}
                      disabled={loading || optimizing}
                    >
                      🗑️ ล้างทั้งหมด
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 11. Description */}
            <div className="form-group span-2">
              <label className="form-label">รายละเอียดสินค้า</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="ระบุจุดเด่น รสชาติ แหล่งเพาะปลูก หรือคำแนะนำในการรับประทาน..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer-custom">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={loading || optimizing}
          >
            ยกเลิก
          </button>

          {mode === 'add' ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn-outline"
                onClick={() => handleSubmit('draft')}
                disabled={loading || optimizing}
              >
                {loading ? 'กำลังบันทึก...' : 'บันทึกแบบร่าง (Save Draft)'}
              </button>
              <button
                type="button"
                className="btn-primary"
                data-testid="btn-submit-product"
                onClick={() => handleSubmit('active')}
                disabled={loading || optimizing}
                style={loading ? { opacity: 0.7, pointerEvents: 'none' } : undefined}
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>กำลังบันทึกข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>บันทึกและเปิดขาย</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn-primary"
              data-testid="btn-submit-product"
              onClick={() => handleSubmit()}
              disabled={loading || optimizing}
              style={loading ? { opacity: 0.7, pointerEvents: 'none' } : undefined}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>กำลังบันทึกข้อมูล...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>บันทึกการแก้ไข</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
