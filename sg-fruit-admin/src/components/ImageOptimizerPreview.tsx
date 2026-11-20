import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  UploadCloud,
  FileImage,
  Download,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Layers,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  processImageOptimization,
  type OptimizationBundle,
} from '../utils/imageOptimizer';

interface ImageOptimizerPreviewProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImageOptimizerPreview: React.FC<ImageOptimizerPreviewProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bundle, setBundle] = useState<OptimizationBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quality settings
  const [mainQuality, setMainQuality] = useState(85);
  const [thumbQuality, setThumbQuality] = useState(82);

  // Active view tab in preview
  const [activePreviewTab, setActivePreviewTab] = useState<'compare' | 'main' | 'thumb' | 'orig'>('compare');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup object URLs when bundle changes or unmounts
  const cleanupUrls = (b: OptimizationBundle | null) => {
    if (!b) return;
    try {
      URL.revokeObjectURL(b.original.url);
      URL.revokeObjectURL(b.main.url);
      URL.revokeObjectURL(b.thumbnail.url);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    return () => {
      cleanupUrls(bundle);
    };
  }, [bundle]);

  if (!isOpen) return null;

  const handleFileChange = async (file: File) => {
    setError(null);
    setLoading(true);
    cleanupUrls(bundle);
    setBundle(null);
    setSelectedFile(file);

    try {
      const res = await processImageOptimization(file, {
        mainQuality: mainQuality / 100,
        thumbQuality: thumbQuality / 100,
      });
      setBundle(res);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการประมวลผลรูปภาพ');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSample = async (filename: string) => {
    setError(null);
    setLoading(true);
    cleanupUrls(bundle);
    setBundle(null);
    try {
      const res = await fetch(`/test-images/${filename}`);
      if (!res.ok) throw new Error(`ไม่พบไฟล์ทดสอบ: ${filename}`);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: blob.type || 'image/png' });
      await handleFileChange(file);
    } catch (err: any) {
      setError(err.message || 'โหลดรูปตัวอย่างไม่สำเร็จ');
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleReoptimize = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    try {
      const res = await processImageOptimization(selectedFile, {
        mainQuality: mainQuality / 100,
        thumbQuality: thumbQuality / 100,
      });
      cleanupUrls(bundle);
      setBundle(res);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการประมวลผลรูปภาพ');
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="modal-backdrop-custom" role="dialog" aria-modal="true">
      <div className="modal-dialog-custom" style={{ maxWidth: '1060px', maxHeight: '92vh' }}>
        {/* HEADER */}
        <div className="modal-header-custom">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={20} style={{ color: 'var(--sage)' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>
                ทดลองปรับขนาดและบีบอัดรูปสินค้า (Local Image Optimization Preview)
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: '4px' }}>
              <span className="badge-experiment">โหมดทดลอง — ยังไม่ได้อัปโหลดหรือบันทึกลงระบบ</span>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                ประมวลผลใน Browser ด้วย Canvas API & WebP
              </span>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn-custom"
            onClick={onClose}
            aria-label="ปิดหน้าต่างทดลอง"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="modal-body-custom">
          {error && (
            <div className="banner-error" style={{ marginBottom: 16 }}>
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>พบข้อผิดพลาดในการประมวลผล:</strong> {error}
              </div>
            </div>
          )}

          {/* QUICK SAMPLE SELECTORS (LOCAL DEV TEST SUITE) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-soft)' }}>
              ชุดรูปภาพทดสอบ:
            </span>
            <button
              type="button"
              className="sample-test-btn"
              data-testid="test-sample-avocado"
              onClick={() => handleLoadSample('sample_transparent_avocado.png')}
              disabled={loading}
            >
              🥑 อะโวคาโดโปร่งใส (2000×1695 PNG)
            </button>
            <button
              type="button"
              className="sample-test-btn"
              data-testid="test-sample-small"
              onClick={() => handleLoadSample('sample_small_300px.png')}
              disabled={loading}
            >
              🖼️ ภาพเล็ก 300px (ทดสอบไม่ขยายเกินจริง)
            </button>
            <button
              type="button"
              className="sample-test-btn"
              data-testid="test-sample-jpeg"
              onClick={() => handleLoadSample('sample_normal.jpg')}
              disabled={loading}
            >
              📸 ภาพ JPEG ทั่วไป (sample_normal.jpg)
            </button>
            <button
              type="button"
              className="sample-test-btn"
              data-testid="test-sample-oversize"
              onClick={() => handleLoadSample('sample_highres.jpg')}
              disabled={loading}
            >
              ⚠️ ภาพเกิน 15MB (ทดสอบ Error Guard)
            </button>
          </div>

          {/* DROPZONE / FILE SELECTOR */}
          <div
            className="optimizer-dropzone"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />
            <div className="dropzone-icon-box">
              <UploadCloud size={32} />
            </div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--ink)' }}>
              คลิกหรือลากไฟล์ภาพมาวางที่นี่เพื่อทดลองบีบอัด
            </div>
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: 4 }}>
              รองรับไฟล์ <strong>JPEG</strong>, <strong>PNG</strong> (คงความโปร่งใส), และ <strong>WebP</strong> (ขนาดสูงสุด 15 MB)
            </p>
          </div>

          {/* LOADING STATE */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <RefreshCw size={24} className="skeleton" style={{ marginBottom: 12, color: 'var(--forest)' }} />
              <div style={{ fontWeight: 700, color: 'var(--ink)' }}>
                กำลังประมวลผลภาพ (Auto Resize 1600px / 480px & WebP Encoding)...
              </div>
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: 4 }}>
                จัดการ EXIF Orientation, ปรับสัดส่วนโดยไม่ยืดภาพ และรักษาสีสันผลไม้
              </p>
            </div>
          )}

          {/* OPTIMIZATION RESULTS */}
          {bundle && !loading && (
            <div style={{ marginTop: 24 }}>
              {/* QUALITY SLIDERS BAR */}
              <div className="quality-controls-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ink)' }}>
                      คุณภาพ Main (1600px):
                    </span>
                    <input
                      type="range"
                      min="60"
                      max="100"
                      value={mainQuality}
                      onChange={(e) => setMainQuality(Number(e.target.value))}
                      style={{ width: 100 }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--forest)' }}>
                      {mainQuality}%
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ink)' }}>
                      คุณภาพ Thumbnail (480px):
                    </span>
                    <input
                      type="range"
                      min="60"
                      max="100"
                      value={thumbQuality}
                      onChange={(e) => setThumbQuality(Number(e.target.value))}
                      style={{ width: 100 }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--forest)' }}>
                      {thumbQuality}%
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-action-edit"
                  onClick={handleReoptimize}
                  title="ประมวลผลใหม่ด้วยค่าคุณภาพที่ปรับ"
                >
                  <RefreshCw size={13} />
                  <span>ประมวลผลใหม่</span>
                </button>
              </div>

              {/* METRICS COMPARISON GRID */}
              <div className="optimizer-metrics-grid">
                {/* 1. Original */}
                <div className="metric-box">
                  <div className="metric-header">
                    <FileImage size={16} />
                    <span>ภาพต้นฉบับ (Original)</span>
                  </div>
                  <div className="metric-val">{bundle.original.sizeFormatted}</div>
                  <div className="metric-detail">
                    มิติ: <strong>{bundle.original.width} × {bundle.original.height} px</strong>
                  </div>
                  <div className="metric-detail">
                    ฟอร์แมต: <span className="metric-format-tag">{bundle.original.type}</span>
                  </div>
                </div>

                {/* 2. Main WebP */}
                <div className="metric-box is-highlight">
                  <div className="metric-header">
                    <CheckCircle2 size={16} style={{ color: 'var(--sage)' }} />
                    <strong>Main Product Image</strong>
                  </div>
                  <div className="metric-val" style={{ color: 'var(--forest-dark)' }}>
                    {bundle.main.sizeFormatted}
                  </div>
                  <div className="metric-detail">
                    มิติ: <strong>{bundle.main.width} × {bundle.main.height} px</strong> (Max 1600)
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {bundle.main.isLarger ? (
                      <span className="diff-badge larger">
                        <TrendingUp size={12} />
                        +{bundle.main.percentageChange}% (ใหญ่กว่าเดิม)
                      </span>
                    ) : (
                      <span className="diff-badge saved">
                        <TrendingDown size={12} />
                        ลดลง {Math.abs(bundle.main.percentageChange)}%
                      </span>
                    )}
                    <span className="metric-format-tag">WebP {bundle.main.quality}%</span>
                  </div>
                </div>

                {/* 3. Thumbnail WebP */}
                <div className="metric-box">
                  <div className="metric-header">
                    <Layers size={16} style={{ color: 'var(--wood)' }} />
                    <strong>Product Thumbnail</strong>
                  </div>
                  <div className="metric-val">{bundle.thumbnail.sizeFormatted}</div>
                  <div className="metric-detail">
                    มิติ: <strong>{bundle.thumbnail.width} × {bundle.thumbnail.height} px</strong> (Max 480)
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="diff-badge saved">
                      <TrendingDown size={12} />
                      ลดลง {Math.abs(bundle.thumbnail.percentageChange)}%
                    </span>
                    <span className="metric-format-tag">WebP {bundle.thumbnail.quality}%</span>
                  </div>
                </div>
              </div>

              {/* VIEW SWITCHER TABS */}
              <div className="preview-nav-tabs">
                <button
                  type="button"
                  className={`preview-tab-btn ${activePreviewTab === 'compare' ? 'active' : ''}`}
                  onClick={() => setActivePreviewTab('compare')}
                >
                  เปรียบเทียบทั้ง 3 ขนาด (Overview)
                </button>
                <button
                  type="button"
                  className={`preview-tab-btn ${activePreviewTab === 'main' ? 'active' : ''}`}
                  onClick={() => setActivePreviewTab('main')}
                >
                  Main WebP ({bundle.main.width} × {bundle.main.height})
                </button>
                <button
                  type="button"
                  className={`preview-tab-btn ${activePreviewTab === 'thumb' ? 'active' : ''}`}
                  onClick={() => setActivePreviewTab('thumb')}
                >
                  Thumbnail ({bundle.thumbnail.width} × {bundle.thumbnail.height})
                </button>
                <button
                  type="button"
                  className={`preview-tab-btn ${activePreviewTab === 'orig' ? 'active' : ''}`}
                  onClick={() => setActivePreviewTab('orig')}
                >
                  ต้นฉบับ ({bundle.original.width} × {bundle.original.height})
                </button>
              </div>

              {/* PREVIEW DISPLAY PANELS */}
              {activePreviewTab === 'compare' && (
                <div className="preview-compare-grid">
                  {/* Original Panel */}
                  <div className="preview-panel">
                    <div className="preview-panel-header">
                      <span>1. ภาพต้นฉบับ</span>
                      <small>{bundle.original.width} × {bundle.original.height} px · {bundle.original.sizeFormatted}</small>
                    </div>
                    <div className="preview-canvas-box checkered-bg">
                      <img
                        src={bundle.original.url}
                        alt="Original fruit"
                        className="preview-img-contain"
                      />
                    </div>
                  </div>

                  {/* Main WebP Panel */}
                  <div className="preview-panel is-focus">
                    <div className="preview-panel-header">
                      <span>2. Main WebP (Max 1600px)</span>
                      <small>{bundle.main.width} × {bundle.main.height} px · {bundle.main.sizeFormatted}</small>
                    </div>
                    <div className="preview-canvas-box checkered-bg">
                      <img
                        src={bundle.main.url}
                        alt="Main WebP"
                        className="preview-img-contain"
                      />
                    </div>
                    <div className="preview-panel-footer">
                      <button
                        type="button"
                        className="btn-download-preview"
                        onClick={() => downloadFile(bundle.main.url, `main_${bundle.original.name.replace(/\.[^.]+$/, '')}.webp`)}
                      >
                        <Download size={14} />
                        <span>ดาวน์โหลด Main WebP</span>
                      </button>
                    </div>
                  </div>

                  {/* Thumbnail Panel */}
                  <div className="preview-panel">
                    <div className="preview-panel-header">
                      <span>3. Thumbnail (Max 480px)</span>
                      <small>{bundle.thumbnail.width} × {bundle.thumbnail.height} px · {bundle.thumbnail.sizeFormatted}</small>
                    </div>
                    <div className="preview-canvas-box checkered-bg">
                      <img
                        src={bundle.thumbnail.url}
                        alt="Thumbnail WebP"
                        className="preview-img-contain"
                        style={{ maxWidth: '240px', maxHeight: '240px' }}
                      />
                    </div>
                    <div className="preview-panel-footer">
                      <button
                        type="button"
                        className="btn-download-preview"
                        onClick={() => downloadFile(bundle.thumbnail.url, `thumb_${bundle.original.name.replace(/\.[^.]+$/, '')}.webp`)}
                      >
                        <Download size={14} />
                        <span>ดาวน์โหลด Thumbnail</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activePreviewTab === 'main' && (
                <div className="preview-single-view">
                  <div className="preview-single-canvas checkered-bg">
                    <img
                      src={bundle.main.url}
                      alt="Main WebP Full"
                      className="preview-img-contain"
                      style={{ maxHeight: '460px' }}
                    />
                  </div>
                  <div className="preview-single-meta">
                    <div>
                      <strong>Main Product WebP Image</strong>
                      <p>
                        ขนาด {bundle.main.width} × {bundle.main.height} px · ขนาดไฟล์ {bundle.main.sizeFormatted} ({bundle.main.percentageChange}% จากต้นฉบับ) · Quality {bundle.main.quality}%
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => downloadFile(bundle.main.url, `main_${bundle.original.name.replace(/\.[^.]+$/, '')}.webp`)}
                    >
                      <Download size={16} />
                      <span>ดาวน์โหลดไฟล์ Main WebP</span>
                    </button>
                  </div>
                </div>
              )}

              {activePreviewTab === 'thumb' && (
                <div className="preview-single-view">
                  <div className="preview-single-canvas checkered-bg">
                    <img
                      src={bundle.thumbnail.url}
                      alt="Thumbnail WebP Full"
                      className="preview-img-contain"
                      style={{ maxHeight: '360px' }}
                    />
                  </div>
                  <div className="preview-single-meta">
                    <div>
                      <strong>Product Thumbnail WebP Image</strong>
                      <p>
                        ขนาด {bundle.thumbnail.width} × {bundle.thumbnail.height} px · ขนาดไฟล์ {bundle.thumbnail.sizeFormatted} · Quality {bundle.thumbnail.quality}%
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => downloadFile(bundle.thumbnail.url, `thumb_${bundle.original.name.replace(/\.[^.]+$/, '')}.webp`)}
                    >
                      <Download size={16} />
                      <span>ดาวน์โหลดไฟล์ Thumbnail WebP</span>
                    </button>
                  </div>
                </div>
              )}

              {activePreviewTab === 'orig' && (
                <div className="preview-single-view">
                  <div className="preview-single-canvas checkered-bg">
                    <img
                      src={bundle.original.url}
                      alt="Original Full"
                      className="preview-img-contain"
                      style={{ maxHeight: '460px' }}
                    />
                  </div>
                  <div className="preview-single-meta">
                    <div>
                      <strong>ภาพต้นฉบับ ({bundle.original.name})</strong>
                      <p>
                        ขนาด {bundle.original.width} × {bundle.original.height} px · ขนาดไฟล์ {bundle.original.sizeFormatted} · Format {bundle.original.type}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="modal-footer-custom">
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
            💡 <strong>คำแนะนำ:</strong> ภาพ Main (1600px) เหมาะสำหรับหน้าแสดงรายละเอียดสินค้า ส่วน Thumbnail (480px) เหมาะสำหรับ Grid รายการสินค้า
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
