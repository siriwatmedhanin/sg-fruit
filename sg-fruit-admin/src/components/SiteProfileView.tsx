import React, { useState, useEffect, useRef } from 'react';
import {
  Store,
  Globe,
  Share2,
  Megaphone,
  FileText,
  Save,
  RotateCcw,
  Upload,
  CheckCircle2,
  AlertCircle,
  Eye,
  ExternalLink,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import type { AuthRole, SiteProfile, SiteProfileFormData } from '../types';
import { fetchAdminSiteProfile, updateAdminSiteProfile, uploadSiteAsset, resolveImageUrl } from '../services/api';
import { LogoCropperModal } from './LogoCropperModal';

interface SiteProfileViewProps {
  role: AuthRole;
  onRefresh?: () => void;
}

export const SiteProfileView: React.FC<SiteProfileViewProps> = ({ role, onRefresh }) => {
  const [profile, setProfile] = useState<SiteProfile | null>(null);
  const [formData, setFormData] = useState<SiteProfileFormData>({
    site_name: 'SG FRUIT',
    site_name_th: 'เอสจี ผลไม้ตามฤดูกาล',
    tagline: 'A Brand by Siriwatmedhanin Group',
    description: 'คัดสรรผลไม้ไทย ผลไม้นำเข้า ผลไม้ตามฤดูกาล และผักสดหลากหลายชนิด เพื่อส่งมอบความสดใหม่สู่ทุกวันของคุณ',
    logo_url: '',
    favicon_url: '',
    line_oa_id: '@sgfruit',
    line_oa_url: 'https://line.me/R/ti/p/@sgfruit',
    phone: '08x-xxx-xxxx',
    email: 'contact@siriwatmedhanin.com',
    address: 'เชียงใหม่ ประเทศไทย',
    business_hours: 'เปิดบริการทุกวัน 08:00 - 18:00 น.',
    facebook_url: 'https://facebook.com/sgfruit.th',
    tiktok_url: '',
    instagram_url: 'https://instagram.com/sgfruit.th',
    shopee_url: '',
    lazada_url: '',
    announcement_enabled: false,
    announcement_text: 'ต้อนรับฤดูกาลผลไม้สดใหม่ ส่งตรงถึงบ้านคุณ สอบถามผลไม้เข้าใหม่ทาง LINE: @sgfruit',
    announcement_link: 'https://line.me/R/ti/p/@sgfruit',
    footer_about: 'คัดสรรผลไม้ไทย ผลไม้นำเข้า ผลไม้ตามฤดูกาล และผักสดหลากหลายชนิด เพื่อส่งมอบความสดใหม่สู่ทุกวันของคุณ',
    footer_copyright: '© 2026 SG FRUIT · เอสจี ผลไม้ตามฤดูกาล (A Brand by Siriwatmedhanin Group)',
    seo_title: 'SG FRUIT | เอสจี ผลไม้ตามฤดูกาล — Shop the Season',
    seo_description: 'SG FRUIT – เอสจี ผลไม้ตามฤดูกาล | เลือกช้อปผลไม้ไทย ผลไม้นำเข้า ผลไม้ตามฤดูกาล และผักสดหลากหลายชนิด คัดสรรความสดเพื่อทุกวันของคุณ (A Brand by Siriwatmedhanin Group)',
    og_image_url: '',
    extra_info_json: '{"delivery_policy":"จัดส่งผ่านรถควบคุมอุณหภูมิและขนส่งด่วนมาตรฐาน","freshness_guarantee":"รับประกันความสดใหม่ หากเสียหายระหว่างจัดส่งเคลมได้ 100%"}'
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploadingAsset, setUploadingAsset] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'brand' | 'contact' | 'social' | 'announcement' | 'footer'>('brand');

  const [logoCropperFile, setLogoCropperFile] = useState<File | null>(null);
  const [isCropperModalOpen, setIsCropperModalOpen] = useState<boolean>(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const ogImageInputRef = useRef<HTMLInputElement>(null);

  // Load Admin Profile
  const loadProfile = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await fetchAdminSiteProfile(role);
      if (res.ok && res.data) {
        setProfile(res.data);
        setFormData({
          site_name: res.data.site_name || 'SG FRUIT',
          site_name_th: res.data.site_name_th || 'เอสจี ผลไม้ตามฤดูกาล',
          tagline: res.data.tagline || '',
          description: res.data.description || '',
          logo_url: res.data.logo_url || '',
          favicon_url: res.data.favicon_url || '',
          line_oa_id: res.data.line_oa_id || '@sgfruit',
          line_oa_url: res.data.line_oa_url || 'https://line.me/R/ti/p/@sgfruit',
          phone: res.data.phone || '',
          email: res.data.email || '',
          address: res.data.address || '',
          business_hours: res.data.business_hours || '',
          facebook_url: res.data.facebook_url || '',
          tiktok_url: res.data.tiktok_url || '',
          instagram_url: res.data.instagram_url || '',
          shopee_url: res.data.shopee_url || '',
          lazada_url: res.data.lazada_url || '',
          announcement_enabled: Boolean(res.data.announcement_enabled),
          announcement_text: res.data.announcement_text || '',
          announcement_link: res.data.announcement_link || '',
          footer_about: res.data.footer_about || '',
          footer_copyright: res.data.footer_copyright || '',
          seo_title: res.data.seo_title || '',
          seo_description: res.data.seo_description || '',
          og_image_url: res.data.og_image_url || '',
          extra_info_json: res.data.extra_info_json || '{}'
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'ไม่สามารถโหลดข้อมูลการตั้งค่าร้านค้าได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [role]);

  // Handle Input Changes
  const handleChange = (field: keyof SiteProfileFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  // Client-side URL Validation
  const validateUrls = (): string | null => {
    const urlsToCheck: Array<{ field: keyof SiteProfileFormData; label: string }> = [
      { field: 'line_oa_url', label: 'LINE OA URL' },
      { field: 'facebook_url', label: 'Facebook URL' },
      { field: 'instagram_url', label: 'Instagram URL' },
      { field: 'tiktok_url', label: 'TikTok URL' },
      { field: 'shopee_url', label: 'Shopee URL' },
      { field: 'lazada_url', label: 'Lazada URL' },
      { field: 'announcement_link', label: 'ลิงก์ประกาศ' },
      { field: 'logo_url', label: 'Logo URL' },
      { field: 'favicon_url', label: 'Favicon URL' },
      { field: 'og_image_url', label: 'OG Image URL' }
    ];

    for (const item of urlsToCheck) {
      const val = formData[item.field];
      if (typeof val === 'string' && val.trim() !== '') {
        const trimmed = val.trim();
        if (/^(javascript|data|vbscript):/i.test(trimmed)) {
          return `ช่อง ${item.label} มีรูปแบบที่ไม่ปลอดภัย (ห้ามใช้ javascript: หรือ data:)`;
        }
        if (!trimmed.startsWith('/') && !/^https?:\/\//i.test(trimmed)) {
          return `ช่อง ${item.label} ต้องขึ้นต้นด้วย https:// หรือ http:// หรือเป็น Relative URL ที่ปลอดภัย`;
        }
      }
    }
    return null;
  };

  // Client-side Brand Positioning Rule Guard
  const validateBrandPositioning = (): string | null => {
    const forbidden = ['เราปลูกเองทั้งหมด', 'สวนผลไม้ของเราเอง 100%', 'ไร่ผลไม้ส่วนตัว'];
    const fields = [formData.tagline, formData.description, formData.footer_about];
    for (const f of fields) {
      for (const phrase of forbidden) {
        if (f.includes(phrase)) {
          return `Brand Positioning Rule: ห้ามใช้ข้อความ '${phrase}' (รักษาภาพลักษณ์ Soft Premium คัดสรรผลไม้ตามฤดูกาล)`;
        }
      }
    }
    return null;
  };

  // Handle Save
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. Validate URLs
    const urlErr = validateUrls();
    if (urlErr) {
      setErrorMessage(urlErr);
      return;
    }

    // 2. Validate Brand Tone
    const brandErr = validateBrandPositioning();
    if (brandErr) {
      setErrorMessage(brandErr);
      return;
    }

    // 3. Validate JSON format
    try {
      JSON.parse(formData.extra_info_json || '{}');
    } catch {
      setErrorMessage('ช่องข้อมูลเพิ่มเติม (extra_info_json) ต้องเป็น JSON ที่ถูกต้อง');
      return;
    }

    try {
      setSaving(true);
      const res = await updateAdminSiteProfile(role, formData);
      if (res.ok) {
        setSuccessMessage('บันทึกข้อมูลการตั้งค่าร้านค้าเรียบร้อยแล้ว');
        if (res.data) setProfile(res.data);
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'บันทึกข้อมูลไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  // Handle Logo Selection (Open Cropper Modal)
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('ขนาดไฟล์เกินขีดจำกัดสำหรับโลโก้ (สูงสุด 2MB)');
      if (logoInputRef.current) logoInputRef.current.value = '';
      return;
    }

    if (!/^image\/(png|webp|jpe?g)$/i.test(file.type)) {
      setErrorMessage('กรุณาเลือกไฟล์ภาพ PNG, WebP หรือ JPG เท่านั้น');
      if (logoInputRef.current) logoInputRef.current.value = '';
      return;
    }

    setLogoCropperFile(file);
    setIsCropperModalOpen(true);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleConfirmCroppedLogo = async (croppedFile: File) => {
    await handleFileUpload('logo', croppedFile);
    setIsCropperModalOpen(false);
    setLogoCropperFile(null);
  };

  // Handle Asset Upload
  const handleFileUpload = async (assetType: 'logo' | 'favicon' | 'og-image', file: File) => {
    try {
      setUploadingAsset(assetType);
      setErrorMessage(null);
      setSuccessMessage(null);

      const res = await uploadSiteAsset(role, assetType, file);
      if (res.ok && res.data) {
        setSuccessMessage(`อัปโหลดไฟล์ ${assetType} สำเร็จ`);
        if (assetType === 'logo') {
          handleChange('logo_url', res.data.url);
        } else if (assetType === 'favicon') {
          handleChange('favicon_url', res.data.url);
        } else if (assetType === 'og-image') {
          handleChange('og_image_url', res.data.url);
        }
        await loadProfile();
      }
    } catch (err: any) {
      setErrorMessage(err.message || `อัปโหลดไฟล์ ${assetType} ล้มเหลว`);
    } finally {
      setUploadingAsset(null);
    }
  };

  return (
    <div className="site-profile-view" style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Store style={{ color: 'var(--forest)' }} /> ตั้งค่าโปรไฟล์และข้อมูลร้านค้า
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '4px' }}>
            จัดการข้อมูลแบรนด์ SG FRUIT, ลิงก์ LINE OA, ช่องทางการติดต่อ และแถบประกาศหน้าร้าน
          </p>
          {profile?.updated_at && (
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
              อัปเดตล่าสุด: {profile.updated_at} {profile.updated_by ? `(โดย ${profile.updated_by})` : ''}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadProfile}
            disabled={loading || saving}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RotateCcw size={16} /> รีเซ็ต
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={loading || saving}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--forest)', color: '#fff' }}
          >
            <Save size={16} /> {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
          </button>
        </div>
      </div>

      {/* Status Alerts */}
      {successMessage && (
        <div style={{ background: '#eaf7ed', border: '1px solid #c2e9cb', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: '#1e4620' }}>
          <CheckCircle2 size={18} style={{ color: '#2e7d32', flexShrink: 0 }} />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div style={{ background: '#fdeeed', border: '1px solid #f9c0bb', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: '#6a1a14' }}>
          <AlertCircle size={18} style={{ color: '#c62828', flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Brand Tone Advisory Badge */}
      <div style={{ background: 'var(--card-bg-soft, #f7f9f7)', border: '1px solid var(--line, #e2e8e2)', padding: '14px 18px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13.5px', color: 'var(--ink)' }}>
        <Sparkles size={18} style={{ color: 'var(--forest)', flexShrink: 0 }} />
        <div>
          <strong>Brand Positioning Note:</strong> SG FRUIT วางตำแหน่งเป็นแบรนด์พรีเมียมคัดสรรผลไม้ตามฤดูกาล (Curated Seasonal Fruits by Siriwatmedhanin Group) ระบบจะตรวจสอบข้อความเพื่อไม่ให้อ้างสิทธิ์ว่าเป็นสวนส่วนตัวหรือปลูกเองทั้งหมด
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: '24px', alignItems: 'start' }}>
        {/* LEFT COLUMN: 5 Form Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section Navigation Pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
            <button
              type="button"
              className={`btn btn-sm ${activeSection === 'brand' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveSection('brand')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Store size={14} /> 1. แบรนด์ & อัตลักษณ์
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeSection === 'contact' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveSection('contact')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Globe size={14} /> 2. การสั่งซื้อ & ติดต่อ
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeSection === 'social' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveSection('social')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Share2 size={14} /> 3. โซเชียลมีเดีย
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeSection === 'announcement' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveSection('announcement')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Megaphone size={14} /> 4. แถบประกาศ
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeSection === 'footer' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveSection('footer')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <FileText size={14} /> 5. Footer & SEO
            </button>
          </div>

          {/* SECTION 1: Brand & Identity */}
          {activeSection === 'brand' && (
            <div className="card" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--forest)' }}>
                <Store size={20} /> 1. ข้อมูลแบรนด์และชื่อร้าน (Brand & Identity)
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label className="form-label">ชื่อร้านภาษาอังกฤษ (Site Name)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.site_name}
                    onChange={(e) => handleChange('site_name', e.target.value)}
                    placeholder="SG FRUIT"
                  />
                </div>
                <div>
                  <label className="form-label">ชื่อร้านภาษาไทย (Thai Name)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.site_name_th}
                    onChange={(e) => handleChange('site_name_th', e.target.value)}
                    placeholder="เอสจี ผลไม้ตามฤดูกาล"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">สโลแกน (Tagline)</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.tagline}
                  onChange={(e) => handleChange('tagline', e.target.value)}
                  placeholder="A Brand by Siriwatmedhanin Group"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">คำอธิบายร้านค้าสั้น (Short Description)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="คัดสรรผลไม้ไทย ผลไม้นำเข้า ผลไม้ตามฤดูกาล และผักสดหลากหลายชนิด..."
                />
              </div>

              {/* Logo Upload & URL */}
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px', marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: '600' }}>โลโก้ร้านค้า (Store Logo: WebP / PNG / JPG, ตัดกรอบวงกลม)</label>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      border: '2px solid var(--forest, #214d34)',
                      background: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      flexShrink: 0,
                    }}
                  >
                    {formData.logo_url ? (
                      <img
                        src={resolveImageUrl(formData.logo_url)}
                        alt="Logo"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: '11px', color: '#888', textAlign: 'center' }}>ไม่มีโลโก้</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="file"
                      ref={logoInputRef}
                      accept="image/webp,image/png,image/jpeg,image/jpg"
                      style={{ display: 'none' }}
                      onChange={handleLogoSelect}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingAsset === 'logo'}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Upload size={14} /> {uploadingAsset === 'logo' ? 'กำลังอัปโหลด...' : 'Crop & อัปโหลดโลโก้'}
                      </button>
                    </div>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={formData.logo_url}
                      onChange={(e) => handleChange('logo_url', e.target.value)}
                      placeholder="/api/images/site/... หรือ URL เต็ม"
                    />
                  </div>
                </div>
              </div>

              {/* Favicon Upload & URL */}
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
                <label className="form-label" style={{ fontWeight: '600' }}>ไอคอน Favicon (.ico / .png / .webp, สูงสุด 1MB)</label>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '6px', border: '1px solid var(--line)', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {formData.favicon_url ? (
                      <img src={formData.favicon_url} alt="Favicon" style={{ maxWidth: '32px', maxHeight: '32px', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontSize: '10px', color: '#888' }}>.ico</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="file"
                      ref={faviconInputRef}
                      accept=".ico,image/png,image/webp"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload('favicon', file);
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => faviconInputRef.current?.click()}
                        disabled={uploadingAsset === 'favicon'}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Upload size={14} /> {uploadingAsset === 'favicon' ? 'กำลังอัปโหลด...' : 'อัปโหลด Favicon'}
                      </button>
                    </div>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={formData.favicon_url}
                      onChange={(e) => handleChange('favicon_url', e.target.value)}
                      placeholder="/api/images/site/... หรือ URL เต็ม"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: Order & Contact */}
          {activeSection === 'contact' && (
            <div className="card" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--forest)' }}>
                <Globe size={20} /> 2. การสั่งซื้อและการติดต่อ (Ordering & Contact)
              </h2>

              <div style={{ background: '#f0f9f0', border: '1px solid #cce8cc', padding: '12px 16px', borderRadius: '8px', marginBottom: '18px' }}>
                <strong style={{ color: '#257028', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                  <ShieldCheck size={16} /> ช่องทางหลักสำหรับการสั่งซื้อ (LINE Official Account)
                </strong>
                <p style={{ fontSize: '13px', color: '#2d5a30', marginTop: '4px' }}>
                  ระบบหน้าร้าน SG FRUIT ใช้ปุ่ม "สั่งซื้อผ่าน LINE" โดยอ้างอิงจาก LINE OA ID ด้านล่างนี้โดยตรง
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label className="form-label">LINE Official Account ID</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.line_oa_id}
                    onChange={(e) => handleChange('line_oa_id', e.target.value)}
                    placeholder="@sgfruit"
                  />
                </div>
                <div>
                  <label className="form-label">LINE OA URL สำหรับคลิกสั่งซื้อ</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.line_oa_url}
                    onChange={(e) => handleChange('line_oa_url', e.target.value)}
                    placeholder="https://line.me/R/ti/p/@sgfruit"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label className="form-label">เบอร์โทรศัพท์ติดต่อ (Phone)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="08x-xxx-xxxx"
                  />
                </div>
                <div>
                  <label className="form-label">อีเมลติดต่อ (Email)</label>
                  <input
                    type="email"
                    className="form-control"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="contact@siriwatmedhanin.com"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">เวลาเปิดทำการ (Business Hours)</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.business_hours}
                  onChange={(e) => handleChange('business_hours', e.target.value)}
                  placeholder="เปิดบริการทุกวัน 08:00 - 18:00 น."
                />
              </div>

              <div>
                <label className="form-label">ที่อยู่ร้านค้า / จุดกระจายสินค้า (Address)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="เชียงใหม่ ประเทศไทย"
                />
              </div>
            </div>
          )}

          {/* SECTION 3: Social & Marketplaces */}
          {activeSection === 'social' && (
            <div className="card" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--forest)' }}>
                <Share2 size={20} /> 3. โซเชียลมีเดียและช่องทางจำหน่าย (Social & Channels)
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="form-label">Facebook Page URL</label>
                  <input
                    type="url"
                    className="form-control"
                    value={formData.facebook_url}
                    onChange={(e) => handleChange('facebook_url', e.target.value)}
                    placeholder="https://facebook.com/sgfruit.th"
                  />
                </div>
                <div>
                  <label className="form-label">Instagram Profile URL</label>
                  <input
                    type="url"
                    className="form-control"
                    value={formData.instagram_url}
                    onChange={(e) => handleChange('instagram_url', e.target.value)}
                    placeholder="https://instagram.com/sgfruit.th"
                  />
                </div>
                <div>
                  <label className="form-label">TikTok Profile URL</label>
                  <input
                    type="url"
                    className="form-control"
                    value={formData.tiktok_url}
                    onChange={(e) => handleChange('tiktok_url', e.target.value)}
                    placeholder="https://tiktok.com/@sgfruit"
                  />
                </div>
                <div>
                  <label className="form-label">Shopee Store URL (ถ้ามี)</label>
                  <input
                    type="url"
                    className="form-control"
                    value={formData.shopee_url}
                    onChange={(e) => handleChange('shopee_url', e.target.value)}
                    placeholder="https://shopee.co.th/sgfruit"
                  />
                </div>
                <div>
                  <label className="form-label">Lazada Store URL (ถ้ามี)</label>
                  <input
                    type="url"
                    className="form-control"
                    value={formData.lazada_url}
                    onChange={(e) => handleChange('lazada_url', e.target.value)}
                    placeholder="https://lazada.co.th/shop/sgfruit"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: Announcement Bar */}
          {activeSection === 'announcement' && (
            <div className="card" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--forest)' }}>
                <Megaphone size={20} /> 4. แถบประกาศสำคัญหน้าร้าน (Announcement Bar)
              </h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', padding: '12px 16px', background: 'var(--card-bg-soft)', borderRadius: '8px' }}>
                <input
                  type="checkbox"
                  id="announcement_enabled_toggle"
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  checked={formData.announcement_enabled}
                  onChange={(e) => handleChange('announcement_enabled', e.target.checked)}
                />
                <label htmlFor="announcement_enabled_toggle" style={{ cursor: 'pointer', fontWeight: '600', color: 'var(--ink)' }}>
                  เปิดใช้งานแถบประกาศด้านบนสุดของเว็บไซต์หน้าร้าน (Top Announcement Bar)
                </label>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">ข้อความประกาศ (Announcement Text)</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.announcement_text}
                  onChange={(e) => handleChange('announcement_text', e.target.value)}
                  placeholder="ต้อนรับฤดูกาลผลไม้สดใหม่ ส่งตรงถึงบ้านคุณ สอบถามผลไม้เข้าใหม่ทาง LINE: @sgfruit"
                />
              </div>

              <div>
                <label className="form-label">ลิงก์ปลายทางเมื่อคลิกแถบประกาศ (Announcement Link)</label>
                <input
                  type="url"
                  className="form-control"
                  value={formData.announcement_link}
                  onChange={(e) => handleChange('announcement_link', e.target.value)}
                  placeholder="https://line.me/R/ti/p/@sgfruit"
                />
              </div>
            </div>
          )}

          {/* SECTION 5: Footer & SEO */}
          {activeSection === 'footer' && (
            <div className="card" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--forest)' }}>
                <FileText size={20} /> 5. ข้อมูลส่วนท้ายและ SEO (Footer & SEO)
              </h2>

              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">ข้อความเกี่ยวกับร้านใน Footer (Footer About Text)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={formData.footer_about}
                  onChange={(e) => handleChange('footer_about', e.target.value)}
                  placeholder="คัดสรรผลไม้ไทย ผลไม้นำเข้า ผลไม้ตามฤดูกาล..."
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">ข้อความลิขสิทธิ์ (Footer Copyright)</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.footer_copyright}
                  onChange={(e) => handleChange('footer_copyright', e.target.value)}
                  placeholder="© 2026 SG FRUIT · เอสจี ผลไม้ตามฤดูกาล (A Brand by Siriwatmedhanin Group)"
                />
              </div>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', color: 'var(--ink)' }}>
                  การตั้งค่าค้นหาและการแชร์ (SEO & Social Sharing)
                </h3>

                <div style={{ marginBottom: '14px' }}>
                  <label className="form-label">SEO Meta Title</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.seo_title}
                    onChange={(e) => handleChange('seo_title', e.target.value)}
                    placeholder="SG FRUIT | เอสจี ผลไม้ตามฤดูกาล — Shop the Season"
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label className="form-label">SEO Meta Description</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={formData.seo_description}
                    onChange={(e) => handleChange('seo_description', e.target.value)}
                    placeholder="SG FRUIT – เอสจี ผลไม้ตามฤดูกาล | เลือกช้อปผลไม้ไทย ผลไม้นำเข้า..."
                  />
                </div>

                {/* OG Image Upload */}
                <div>
                  <label className="form-label" style={{ fontWeight: '600' }}>รูปภาพ Social Share (OG Image: JPG / PNG / WebP, สูงสุด 5MB)</label>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ width: '120px', height: '63px', borderRadius: '6px', border: '1px solid var(--line)', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {formData.og_image_url ? (
                        <img src={formData.og_image_url} alt="OG Image" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '11px', color: '#888' }}>1200x630</span>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <input
                        type="file"
                        ref={ogImageInputRef}
                        accept="image/jpeg,image/png,image/webp"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload('og-image', file);
                        }}
                      />
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => ogImageInputRef.current?.click()}
                          disabled={uploadingAsset === 'og-image'}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Upload size={14} /> {uploadingAsset === 'og-image' ? 'กำลังอัปโหลด...' : 'อัปโหลด OG Image'}
                        </button>
                      </div>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={formData.og_image_url}
                        onChange={(e) => handleChange('og_image_url', e.target.value)}
                        placeholder="/api/images/site/... หรือ URL เต็ม"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Extra Info JSON */}
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
                <label className="form-label">ข้อมูลเพิ่มเติมในรูปแบบ JSON (Extra Info JSON)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={formData.extra_info_json}
                  onChange={(e) => handleChange('extra_info_json', e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '12px' }}
                  placeholder='{"delivery_policy":"...","freshness_guarantee":"..."}'
                />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Live Real-time Storefront Preview */}
        <div style={{ position: 'sticky', top: '24px' }}>
          <div className="card" style={{ padding: '20px', border: '1px solid var(--forest)', boxShadow: '0 4px 20px rgba(33, 77, 52, 0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--line)', paddingBottom: '10px' }}>
              <span style={{ fontWeight: '700', fontSize: '14.5px', color: 'var(--forest)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Eye size={16} /> หน้าร้านจำลอง (Live Preview)
              </span>
              <span style={{ fontSize: '11px', background: 'var(--card-bg-soft)', padding: '2px 8px', borderRadius: '12px', color: 'var(--muted)' }}>
                Real-time
              </span>
            </div>

            {/* Announcement Bar Preview */}
            {formData.announcement_enabled && (
              <div style={{ background: '#1c472c', color: '#e8f5e9', padding: '6px 12px', borderRadius: '4px', fontSize: '11.5px', textAlign: 'center', marginBottom: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                📢 {formData.announcement_text || 'แถบประกาศหน้าร้าน'}
              </div>
            )}

            {/* Storefront Header Simulation */}
            <div style={{ background: '#f8faf8', border: '1px solid #e2e8e2', borderRadius: '8px', padding: '16px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '6px', background: '#fff', border: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {formData.logo_url ? (
                    <img src={formData.logo_url} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontWeight: 'bold', color: 'var(--forest)' }}>SG</span>
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--ink)' }}>
                    {formData.site_name || 'SG FRUIT'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    {formData.site_name_th || 'เอสจี ผลไม้ตามฤดูกาล'}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '11.5px', color: '#666', marginTop: '8px', fontStyle: 'italic' }}>
                {formData.tagline}
              </div>
            </div>

            {/* Simulated LINE Checkout Button */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--ink)', marginBottom: '6px' }}>
                ปุ่มสั่งซื้อผ่าน LINE (Storefront CTA):
              </div>
              <a
                href={formData.line_oa_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: '#06C755',
                  color: '#fff',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '13px',
                  textDecoration: 'none'
                }}
              >
                <span>สั่งซื้อผลไม้ผ่าน LINE {formData.line_oa_id}</span>
                <ExternalLink size={14} />
              </a>
            </div>

            {/* Simulated Contact List */}
            <div style={{ background: '#fafafa', borderRadius: '6px', padding: '12px', fontSize: '12px', color: '#555', marginBottom: '14px' }}>
              <div style={{ fontWeight: '600', marginBottom: '4px', color: 'var(--ink)' }}>ข้อมูลติดต่อ:</div>
              <div>📞 {formData.phone || '08x-xxx-xxxx'}</div>
              <div>✉️ {formData.email || 'contact@...'}</div>
              <div>📍 {formData.address || 'เชียงใหม่'}</div>
              <div>🕒 {formData.business_hours || 'เปิดทุกวัน'}</div>
            </div>

            {/* Simulated Footer Preview */}
            <div style={{ borderTop: '1px solid #eee', paddingTop: '10px', fontSize: '11px', color: '#888', textAlign: 'center' }}>
              <p style={{ marginBottom: '4px' }}>{formData.footer_about}</p>
              <p style={{ fontWeight: '500' }}>{formData.footer_copyright}</p>
            </div>
          </div>
        </div>
      </div>

      {/* LOGO CROPPER & LIVE PREVIEW MODAL */}
      {isCropperModalOpen && logoCropperFile && (
        <LogoCropperModal
          isOpen={isCropperModalOpen}
          imageFile={logoCropperFile}
          onClose={() => {
            setIsCropperModalOpen(false);
            setLogoCropperFile(null);
          }}
          onConfirm={handleConfirmCroppedLogo}
          uploading={uploadingAsset === 'logo'}
        />
      )}
    </div>
  );
};
