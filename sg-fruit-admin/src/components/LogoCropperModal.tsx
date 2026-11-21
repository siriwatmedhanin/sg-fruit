import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  Move,
  Sparkles,
  ShoppingBag,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface LogoCropperModalProps {
  imageFile: File;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (croppedFile: File) => Promise<void> | void;
  uploading?: boolean;
}

export const LogoCropperModal: React.FC<LogoCropperModalProps> = ({
  imageFile,
  isOpen,
  onClose,
  onConfirm,
  uploading = false,
}) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageLoading, setImageLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const [scale, setScale] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [bgColor, setBgColor] = useState<'transparent' | 'white'>('transparent');
  const [initialFitScale, setInitialFitScale] = useState<number>(1);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const headerPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const largePreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const CANVAS_SIZE = 360;
  const CROP_RADIUS = 135; // Diameter = 270px

  // 1. Read File with FileReader (readAsDataURL) - strictly NO crossOrigin = 'anonymous' on local data!
  useEffect(() => {
    if (!imageFile) return;

    let isMounted = true;
    setImage(null);
    setImageLoading(true);
    setErrorMsg(null);

    const reader = new FileReader();

    reader.onload = (e) => {
      if (!isMounted) return;
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        setErrorMsg('ไม่สามารถอ่านข้อมูลไฟล์รูปภาพได้');
        setImageLoading(false);
        return;
      }

      const img = new Image();
      // IMPORTANT: DO NOT set img.crossOrigin for local data URLs!
      img.onload = () => {
        if (!isMounted) return;
        setImage(img);
        setImageLoading(false);

        // Fit image nicely into circular aperture initially
        const diameter = CROP_RADIUS * 2;
        const fitScale = Math.max(diameter / img.width, diameter / img.height);
        setInitialFitScale(fitScale);
        setScale(fitScale);
        setOffset({ x: 0, y: 0 });
      };

      img.onerror = (err) => {
        console.error('Image decoding error:', err);
        if (isMounted) {
          setErrorMsg('ไฟล์รูปภาพเสียหายหรือไม่สามารถถอดรหัสได้ กรุณาเลือกไฟล์ภาพใหม่อีกครั้ง');
          setImageLoading(false);
        }
      };

      img.src = dataUrl;
    };

    reader.onerror = (err) => {
      console.error('FileReader read error:', err);
      if (isMounted) {
        setErrorMsg('เกิดข้อผิดพลาดในการเปิดไฟล์ภาพจากเครื่อง');
        setImageLoading(false);
      }
    };

    reader.readAsDataURL(imageFile);

    return () => {
      isMounted = false;
    };
  }, [imageFile]);

  // 2. Draw Main Cropper Canvas
  const drawMainCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = CANVAS_SIZE / 2;
    const centerY = CANVAS_SIZE / 2;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // 2.1 Draw Background (Checkerboard or Solid White)
    if (bgColor === 'transparent') {
      const tileSize = 12;
      for (let y = 0; y < CANVAS_SIZE; y += tileSize) {
        for (let x = 0; x < CANVAS_SIZE; x += tileSize) {
          ctx.fillStyle = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0 ? '#E2E8F0' : '#FFFFFF';
          ctx.fillRect(x, y, tileSize, tileSize);
        }
      }
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }

    // 2.2 Draw Image if Loaded
    if (image) {
      ctx.save();
      ctx.translate(centerX + offset.x, centerY + offset.y);
      ctx.scale(scale, scale);
      ctx.drawImage(image, -image.width / 2, -image.height / 2);
      ctx.restore();
    } else {
      // Loading placeholder in center of crop circle
      ctx.save();
      ctx.fillStyle = '#64748B';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(imageLoading ? 'กำลังโหลดภาพ...' : 'ยังไม่มีภาพ', centerX, centerY);
      ctx.restore();
    }

    // 2.3 Draw Dark Cutout Overlay (Outside of Circle is dimmed)
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.beginPath();
    ctx.rect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    // Counter-clockwise arc creates the transparent circular window
    ctx.arc(centerX, centerY, CROP_RADIUS, 0, Math.PI * 2, true);
    ctx.fill();

    // 2.4 Circular Guideline Border
    ctx.beginPath();
    ctx.arc(centerX, centerY, CROP_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = '#10B981'; // emerald-500
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Subtle outer dashed ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, CROP_RADIUS + 3, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Center Crosshairs
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(centerX - 16, centerY);
    ctx.lineTo(centerX + 16, centerY);
    ctx.moveTo(centerX, centerY - 16);
    ctx.lineTo(centerX, centerY + 16);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }, [image, imageLoading, scale, offset, bgColor]);

  // 3. Draw Header Preview Canvas (48x48)
  const drawHeaderPreview = useCallback(() => {
    const canvas = headerPreviewCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 48, 48);

    if (bgColor === 'white') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 48, 48);
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(24, 24, 24, 0, Math.PI * 2);
    ctx.clip();

    if (image) {
      const ratio = 48 / (CROP_RADIUS * 2);
      ctx.translate(24 + offset.x * ratio, 24 + offset.y * ratio);
      ctx.scale(scale * ratio, scale * ratio);
      ctx.drawImage(image, -image.width / 2, -image.height / 2);
    } else {
      ctx.fillStyle = '#F1F5F9';
      ctx.fillRect(0, 0, 48, 48);
    }
    ctx.restore();
  }, [image, scale, offset, bgColor]);

  // 4. Draw Large Preview Canvas (88x88)
  const drawLargePreview = useCallback(() => {
    const canvas = largePreviewCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 88, 88);

    if (bgColor === 'white') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 88, 88);
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(44, 44, 44, 0, Math.PI * 2);
    ctx.clip();

    if (image) {
      const ratio = 88 / (CROP_RADIUS * 2);
      ctx.translate(44 + offset.x * ratio, 44 + offset.y * ratio);
      ctx.scale(scale * ratio, scale * ratio);
      ctx.drawImage(image, -image.width / 2, -image.height / 2);
    } else {
      ctx.fillStyle = '#F1F5F9';
      ctx.fillRect(0, 0, 88, 88);
    }
    ctx.restore();
  }, [image, scale, offset, bgColor]);

  // Render with requestAnimationFrame to ensure canvas has valid dimensions
  useEffect(() => {
    let animId: number;
    const renderAll = () => {
      drawMainCanvas();
      drawHeaderPreview();
      drawLargePreview();
    };

    animId = requestAnimationFrame(renderAll);
    return () => cancelAnimationFrame(animId);
  }, [drawMainCanvas, drawHeaderPreview, drawLargePreview]);

  // Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!image) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !image) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Drag Handlers (Mobile Support)
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!image) return;
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || !image || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStart.x;
    const dy = e.touches[0].clientY - dragStart.y;
    setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!image) return;
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
    setScale((prev) => Math.min(3.5, Math.max(0.3, prev * zoomFactor)));
  };

  // Reset Position & Zoom
  const handleReset = () => {
    setScale(initialFitScale);
    setOffset({ x: 0, y: 0 });
  };

  // 5. Render 512x512 High-Res Blob and Upload
  const handleConfirmCrop = async () => {
    if (!image) {
      setErrorMsg('ยังโหลดภาพไม่เสร็จสมบูรณ์ กรุณารอสักครู่');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMsg(null);

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = 512;
      exportCanvas.height = 512;
      const eCtx = exportCanvas.getContext('2d');
      if (!eCtx) {
        throw new Error('ไม่สามารถสร้าง Canvas Context สำหรับ Export ได้');
      }

      if (bgColor === 'white') {
        eCtx.fillStyle = '#FFFFFF';
        eCtx.fillRect(0, 0, 512, 512);
      }

      // Clip to circle so outside is transparent
      eCtx.save();
      eCtx.beginPath();
      eCtx.arc(256, 256, 256, 0, Math.PI * 2);
      eCtx.clip();

      // Export scale ratio: 512 / (2 * CROP_RADIUS)
      const exportRatio = 512 / (CROP_RADIUS * 2);
      eCtx.translate(256 + offset.x * exportRatio, 256 + offset.y * exportRatio);
      eCtx.scale(scale * exportRatio, scale * exportRatio);
      eCtx.drawImage(image, -image.width / 2, -image.height / 2);
      eCtx.restore();

      // Convert to blob helper
      const getBlob = (type: string, quality?: number): Promise<Blob | null> => {
        return new Promise((resolve) => exportCanvas.toBlob(resolve, type, quality));
      };

      let blob = await getBlob('image/webp', 0.92);
      let filename = 'sg-fruit-logo.webp';
      let mimeType = 'image/webp';

      // Fallback to PNG if webp export returns null
      if (!blob || blob.size === 0) {
        blob = await getBlob('image/png');
        filename = 'sg-fruit-logo.png';
        mimeType = 'image/png';
      }

      if (!blob || blob.size === 0) {
        throw new Error('ไม่สามารถแปลงรูปภาพเป็นไฟล์ Blob ได้');
      }

      const croppedFile = new File([blob], filename, { type: mimeType });
      await onConfirm(croppedFile);
    } catch (err: any) {
      console.error('Error during logo crop and upload:', err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการครอบตัดและอัปโหลดโลโก้');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const isBusy = isProcessing || uploading;

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '94vh',
          background: '#ffffff',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fafafa',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#ecfdf5',
                color: '#047857',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                ปรับแต่งและครอบตัดโลโก้ร้านค้า (Logo Cropper)
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                ลากเพื่อจัดตำแหน่ง ซูมขยาย และตรวจเช็กการแสดงผลบน Header ร้านค้าจริง
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            disabled={isBusy}
            style={{
              border: 'none',
              background: 'transparent',
              padding: '6px',
              borderRadius: '6px',
              cursor: isBusy ? 'not-allowed' : 'pointer',
              color: '#64748b',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* ERROR ALERT */}
          {errorMsg && (
            <div
              style={{
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#991B1B',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* MAIN EDITING AREA (2 Columns on Desktop) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(360px, 380px) 1fr',
              gap: '24px',
              alignItems: 'start',
            }}
          >
            {/* LEFT: INTERACTIVE CANVAS */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  position: 'relative',
                  width: `${CANVAS_SIZE}px`,
                  height: `${CANVAS_SIZE}px`,
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  cursor: isDragging ? 'grabbing' : image ? 'grab' : 'default',
                  touchAction: 'none',
                  background: '#F8FAFC',
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={CANVAS_SIZE}
                  height={CANVAS_SIZE}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onWheel={handleWheel}
                  style={{ width: '100%', height: '100%', display: 'block' }}
                />
                {image && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(15, 23, 42, 0.75)',
                      color: '#ffffff',
                      padding: '3px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      pointerEvents: 'none',
                    }}
                  >
                    <Move size={12} /> คลิกลากเพื่อเลื่อนตำแหน่ง
                  </div>
                )}
              </div>

              {/* CONTROLS: ZOOM SLIDER & BUTTONS */}
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: '#f8fafc',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <button
                  type="button"
                  disabled={!image || isBusy}
                  onClick={() => setScale((prev) => Math.max(0.3, prev - 0.1))}
                  style={{
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    cursor: !image || isBusy ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="ย่อขนาด"
                >
                  <ZoomOut size={16} />
                </button>
                <input
                  type="range"
                  min="0.3"
                  max="3.0"
                  step="0.05"
                  disabled={!image || isBusy}
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: '#10b981', cursor: !image || isBusy ? 'not-allowed' : 'pointer' }}
                />
                <button
                  type="button"
                  disabled={!image || isBusy}
                  onClick={() => setScale((prev) => Math.min(3.0, prev + 0.1))}
                  style={{
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    cursor: !image || isBusy ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="ขยายขนาด"
                >
                  <ZoomIn size={16} />
                </button>
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569', minWidth: '42px', textAlign: 'right' }}>
                  {scale.toFixed(2)}x
                </span>
                <button
                  type="button"
                  disabled={!image || isBusy}
                  onClick={handleReset}
                  style={{
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    cursor: !image || isBusy ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    color: '#475569',
                  }}
                  title="รีเซ็ตตำแหน่งและขนาด"
                >
                  <RotateCcw size={12} /> รีเซ็ต
                </button>
              </div>

              {/* BACKGROUND COLOR OPTIONS */}
              <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>พื้นหลังโลโก้:</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setBgColor('transparent')}
                    disabled={isBusy}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: bgColor === 'transparent' ? '1.5px solid #10b981' : '1px solid #cbd5e1',
                      background: bgColor === 'transparent' ? '#ecfdf5' : '#fff',
                      color: bgColor === 'transparent' ? '#047857' : '#475569',
                    }}
                  >
                    โปร่งใส (Transparent)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBgColor('white')}
                    disabled={isBusy}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: bgColor === 'white' ? '1.5px solid #10b981' : '1px solid #cbd5e1',
                      background: bgColor === 'white' ? '#ecfdf5' : '#fff',
                      color: bgColor === 'white' ? '#047857' : '#475569',
                    }}
                  >
                    พื้นหลังสีขาว
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT: REAL-TIME STOREFRONT PREVIEWS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                  ตัวอย่างการแสดงผลบน Header หน้าร้านจริง (Live Storefront Preview)
                </label>
                <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block', marginBottom: '10px' }}>
                  จำลองแถบ Navigation Bar ของ <code>https://sg-fruit.siriwatmedhanin.com</code>
                </span>

                {/* SIMULATED STOREFRONT HEADER BAR */}
                <div
                  style={{
                    background: '#F8F6F0',
                    border: '1px solid rgba(33, 77, 52, 0.16)',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    {/* BRAND MARK & LOGO */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid rgba(33, 77, 52, 0.16)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                        }}
                      >
                        <canvas
                          ref={headerPreviewCanvasRef}
                          width={48}
                          height={48}
                          style={{ width: '48px', height: '48px', display: 'block' }}
                        />
                      </div>
                      <div>
                        <div
                          style={{
                            fontFamily: '"Cormorant Garamond", Georgia, serif',
                            fontSize: '22px',
                            fontWeight: 700,
                            lineHeight: 1,
                            color: '#1e293b',
                            letterSpacing: '0.02em',
                          }}
                        >
                          SG FRUIT
                        </div>
                        <div
                          style={{
                            fontSize: '9.5px',
                            fontWeight: 500,
                            color: '#64748b',
                            letterSpacing: '0.04em',
                            marginTop: '2px',
                          }}
                        >
                          เอสจี ผลไม้ตามฤดูกาล
                        </div>
                      </div>
                    </div>

                    {/* MOCK NAV LINKS */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11.5px', color: '#64748b' }}>
                      <span style={{ color: '#2d5a27', fontWeight: 600 }}>หน้าแรก</span>
                      <span>เลือกซื้อสินค้า</span>
                      <span>ติดต่อเรา</span>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: '#fff',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#2d5a27',
                        }}
                      >
                        <ShoppingBag size={14} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* LARGE CIRCLE PREVIEW */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '18px',
                }}
              >
                <div
                  style={{
                    width: '88px',
                    height: '88px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    border: '2px solid #10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
                    flexShrink: 0,
                  }}
                >
                  <canvas
                    ref={largePreviewCanvasRef}
                    width={88}
                    height={88}
                    style={{ width: '88px', height: '88px', display: 'block' }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                    พรีวิวโลโก้กรอบวงกลมความละเอียดสูง (512x512)
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px', lineHeight: 1.5 }}>
                    ระบบจะตัดภาพเป็นกรอบวงกลมสัดส่วน 1:1 และบันทึกเป็นไฟล์ WebP ความละเอียดสูง เพื่อความคมชัดสูงสุดบนทุกหน้าจอ
                  </div>
                  <div style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#047857', background: '#ecfdf5', padding: '2px 8px', borderRadius: '4px' }}>
                    ✓ พร้อมส่งขึ้น Cloudflare R2
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            background: '#fafafa',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isBusy}
            style={{ fontSize: '13px' }}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirmCrop}
            disabled={!image || isBusy}
            style={{
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: !image || isBusy ? '#94A3B8' : '#1B4332',
              borderColor: !image || isBusy ? '#94A3B8' : '#1B4332',
              padding: '8px 20px',
              cursor: !image || isBusy ? 'not-allowed' : 'pointer',
              color: '#ffffff',
              fontWeight: 600,
              borderRadius: '8px',
            }}
          >
            {isBusy ? (
              <>
                <Loader2 size={16} className="spin" /> กำลังอัปโหลด...
              </>
            ) : (
              <>
                <Check size={16} strokeWidth={2} /> ยืนยันและอัปโหลดโลโก้
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
