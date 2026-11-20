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

  // 1. Load Image from File
  useEffect(() => {
    if (!imageFile) return;

    const objectUrl = URL.createObjectURL(imageFile);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);

      // Calculate initial scale to cover the crop circle
      const diameter = CROP_RADIUS * 2;
      const fitScale = Math.max(diameter / img.width, diameter / img.height);
      setInitialFitScale(fitScale);
      setScale(fitScale);
      setOffset({ x: 0, y: 0 });
    };

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile]);

  // 2. Render Main Cropper Canvas
  const drawMainCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = CANVAS_SIZE / 2;
    const centerY = CANVAS_SIZE / 2;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // If transparent, draw checkerboard pattern
    if (bgColor === 'transparent') {
      const tileSize = 12;
      for (let y = 0; y < CANVAS_SIZE; y += tileSize) {
        for (let x = 0; x < CANVAS_SIZE; x += tileSize) {
          ctx.fillStyle = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0 ? '#f3f4f6' : '#ffffff';
          ctx.fillRect(x, y, tileSize, tileSize);
        }
      }
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }

    // Draw transformed image
    ctx.save();
    ctx.translate(centerX + offset.x, centerY + offset.y);
    ctx.scale(scale, scale);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    ctx.restore();

    // Draw Darkened Mask with Circular Cutout
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.62)';
    ctx.beginPath();
    ctx.rect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    // Counter-clockwise arc creates the transparent circle hole
    ctx.arc(centerX, centerY, CROP_RADIUS, 0, Math.PI * 2, true);
    ctx.fill();

    // Circular guideline border
    ctx.beginPath();
    ctx.arc(centerX, centerY, CROP_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = '#10b981'; // emerald-500
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Center Crosshair
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
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
  }, [image, scale, offset, bgColor]);

  // 3. Render Header Preview Canvas (48x48)
  const drawHeaderPreview = useCallback(() => {
    const canvas = headerPreviewCanvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 48, 48);

    if (bgColor === 'white') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 48, 48);
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(24, 24, 24, 0, Math.PI * 2);
    ctx.clip();

    const ratio = 48 / (CROP_RADIUS * 2);
    ctx.translate(24 + offset.x * ratio, 24 + offset.y * ratio);
    ctx.scale(scale * ratio, scale * ratio);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    ctx.restore();
  }, [image, scale, offset, bgColor]);

  // 4. Render Large Preview Canvas (88x88)
  const drawLargePreview = useCallback(() => {
    const canvas = largePreviewCanvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 88, 88);

    if (bgColor === 'white') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 88, 88);
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(44, 44, 44, 0, Math.PI * 2);
    ctx.clip();

    const ratio = 88 / (CROP_RADIUS * 2);
    ctx.translate(44 + offset.x * ratio, 44 + offset.y * ratio);
    ctx.scale(scale * ratio, scale * ratio);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    ctx.restore();
  }, [image, scale, offset, bgColor]);

  useEffect(() => {
    drawMainCanvas();
    drawHeaderPreview();
    drawLargePreview();
  }, [drawMainCanvas, drawHeaderPreview, drawLargePreview]);

  // Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
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
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
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
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
    setScale((prev) => Math.min(3.5, Math.max(0.3, prev * zoomFactor)));
  };

  // Reset Position & Zoom
  const handleReset = () => {
    setScale(initialFitScale);
    setOffset({ x: 0, y: 0 });
  };

  // Export 512x512 WebP / PNG
  const handleConfirmCrop = () => {
    if (!image) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 512;
    exportCanvas.height = 512;
    const eCtx = exportCanvas.getContext('2d');
    if (!eCtx) return;

    if (bgColor === 'white') {
      eCtx.fillStyle = '#ffffff';
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

    // Export as WebP (lossless or 0.95 quality)
    exportCanvas.toBlob(
      (blob) => {
        if (!blob) {
          // Fallback to PNG
          exportCanvas.toBlob((pngBlob) => {
            if (!pngBlob) return;
            const croppedFile = new File([pngBlob], 'sg-fruit-logo.png', { type: 'image/png' });
            onConfirm(croppedFile);
          }, 'image/png');
          return;
        }
        const croppedFile = new File([blob], 'sg-fruit-logo.webp', { type: 'image/webp' });
        onConfirm(croppedFile);
      },
      'image/webp',
      0.95
    );
  };

  if (!isOpen) return null;

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
            disabled={uploading}
            style={{
              border: 'none',
              background: 'transparent',
              padding: '6px',
              borderRadius: '6px',
              cursor: 'pointer',
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
            gap: '20px',
          }}
        >
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
                  cursor: isDragging ? 'grabbing' : 'grab',
                  touchAction: 'none',
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
                  onClick={() => setScale((prev) => Math.max(0.3, prev - 0.1))}
                  style={{
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    cursor: 'pointer',
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
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: '#10b981', cursor: 'pointer' }}
                />
                <button
                  type="button"
                  onClick={() => setScale((prev) => Math.min(3.0, prev + 0.1))}
                  style={{
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    cursor: 'pointer',
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
                  onClick={handleReset}
                  style={{
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    cursor: 'pointer',
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
            disabled={uploading}
            style={{ fontSize: '13px' }}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirmCrop}
            disabled={uploading}
            style={{
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#2d5a27',
              borderColor: '#2d5a27',
              padding: '8px 18px',
            }}
          >
            {uploading ? (
              'กำลังอัปโหลด...'
            ) : (
              <>
                <Check size={16} /> ยืนยันและอัปโหลดโลโก้
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
