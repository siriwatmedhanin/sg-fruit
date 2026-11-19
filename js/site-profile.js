/**
 * SG FRUIT (เอสจี ผลไม้ตามฤดูกาล) — Storefront Site Profile & Store Settings Dynamic Hydration
 * 
 * Features:
 * 1. Progressive Enhancement & Safe Fallback:
 *    - Fetches GET /api/site-profile non-blocking.
 *    - If API is offline or returns error, website silently retains existing hardcoded content.
 *    - Zero layout shift, zero cart disruption.
 * 2. Strict XSS Prevention:
 *    - All dynamic texts injected strictly via .textContent (NEVER .innerHTML).
 *    - URL schemes validated against https: / http: and relative paths.
 *    - Rejects dangerous schemes: javascript:, data:, vbscript:.
 * 3. Storefront Hydration Points:
 *    - Brand Name & Thai Name (.brand-name, .brand-sub, .footer-brand strong, .footer-brand-th)
 *    - Brand Tagline (.footer-brand-group)
 *    - Brand Logo (.brand-logo-img src)
 *    - Contact Info (LINE OA, Phone, Hours, Address)
 *    - Footer About & Copyright
 *    - Top Announcement Bar (with dismiss memory)
 * 4. Zero Animation Touch:
 *    - Does NOT touch or alter GSAP Storytelling Steps 1-6.
 */

(function (global) {
  'use strict';

  // Fallback defaults
  const DEFAULTS = {
    site_name: 'SG FRUIT',
    site_name_th: 'เอสจี ผลไม้ตามฤดูกาล',
    tagline: 'A Brand by Siriwatmedhanin Group',
    description: 'คัดสรรผลไม้ไทย ผลไม้นำเข้า ผลไม้ตามฤดูกาล และผักสดหลากหลายชนิด เพื่อส่งมอบความสดใหม่สู่ทุกวันของคุณ',
    line_oa_id: '@sgfruit',
    line_oa_url: 'https://line.me/R/ti/p/@sgfruit',
    phone: '091-909-8902',
    email: 'contact@siriwatmedhanin.com',
    business_hours: 'เปิดบริการทุกวัน 08:00 - 18:00 น.',
    footer_about: 'คัดสรรผลไม้ไทย ผลไม้นำเข้า ผลไม้ตามฤดูกาล และผักสดหลากหลายชนิด เพื่อส่งมอบความสดใหม่สู่ทุกวันของคุณ',
    footer_copyright: '© 2026 SG FRUIT · เอสจี ผลไม้ตามฤดูกาล (A Brand by Siriwatmedhanin Group)',
  };

  /**
   * Safe URL Validator:
   * Accepts only http://, https://, or safe relative paths starting with /
   * Rejects javascript:, data:, vbscript:, and anything with angle brackets
   */
  function isValidUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (/^(javascript|data|vbscript):/i.test(trimmed)) return false;
    if (/<[^>]*>/i.test(trimmed)) return false;
    if (trimmed.startsWith('/')) {
      return !trimmed.includes('..') && !trimmed.includes('\\');
    }
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Safe DOM Text Setter (NEVER innerHTML)
   */
  function safeSetText(selector, text) {
    if (!text || typeof text !== 'string') return;
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach(function (el) {
        el.textContent = text;
      });
    } catch (e) {
      // Non-blocking catch
    }
  }

  /**
   * Safe DOM Attribute Setter with URL validation
   */
  function safeSetAttr(selector, attr, val) {
    if (!val || typeof val !== 'string') return;
    if ((attr === 'href' || attr === 'src') && !isValidUrl(val)) return;
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach(function (el) {
        el.setAttribute(attr, val);
      });
    } catch (e) {
      // Non-blocking catch
    }
  }

  /**
   * Injects Top Announcement Bar safely if enabled
   */
  function renderAnnouncementBar(announcement) {
    if (!announcement || !announcement.enabled || !announcement.text) return;

    // Check if dismissed in this session
    try {
      if (sessionStorage.getItem('sg_announcement_dismissed') === 'true') {
        return;
      }
    } catch (e) {}

    // Check if bar already exists
    let bar = document.getElementById('sg-announcement-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'sg-announcement-bar';
      bar.className = 'sg-announcement-bar';
      bar.style.cssText = [
        'background: #1c472c;',
        'color: #f7f9f7;',
        'padding: 8px 16px;',
        'font-size: 13px;',
        'text-align: center;',
        'display: flex;',
        'align-items: center;',
        'justify-content: center;',
        'gap: 12px;',
        'position: relative;',
        'z-index: 1000;',
        'box-shadow: 0 2px 8px rgba(0,0,0,0.15);'
      ].join(' ');

      const textSpan = document.createElement('span');
      textSpan.className = 'sg-announcement-text';
      textSpan.style.cssText = 'flex: 1; max-width: 900px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
      textSpan.textContent = announcement.text;

      if (announcement.link && isValidUrl(announcement.link)) {
        const link = document.createElement('a');
        link.href = announcement.link;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.cssText = 'color: #ffd700; text-decoration: underline; margin-left: 6px; font-weight: 600;';
        link.textContent = 'ดูรายละเอียด →';
        textSpan.appendChild(link);
      }

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', 'ปิดแถบประกาศ');
      closeBtn.style.cssText = 'background: transparent; border: none; color: #f7f9f7; cursor: pointer; font-size: 16px; line-height: 1; padding: 4px 8px; opacity: 0.8;';
      closeBtn.textContent = '✕';
      closeBtn.onclick = function () {
        bar.remove();
        try {
          sessionStorage.setItem('sg_announcement_dismissed', 'true');
        } catch (e) {}
        if (global.ScrollTrigger && typeof global.ScrollTrigger.refresh === 'function') {
          global.ScrollTrigger.refresh();
        }
      };

      bar.appendChild(textSpan);
      bar.appendChild(closeBtn);

      const header = document.querySelector('header.header');
      if (header && header.parentNode) {
        header.parentNode.insertBefore(bar, header);
      } else {
        document.body.insertBefore(bar, document.body.firstChild);
      }

      if (global.ScrollTrigger && typeof global.ScrollTrigger.refresh === 'function') {
        global.ScrollTrigger.refresh();
      }
    } else {
      const textSpan = bar.querySelector('.sg-announcement-text');
      if (textSpan) textSpan.textContent = announcement.text;
    }
  }

  function resolveAssetUrl(url, apiBase) {
    if (!url || typeof url !== 'string') return '';
    if (url.startsWith('/api/') && apiBase && apiBase.startsWith('http')) {
      try {
        const origin = new URL(apiBase).origin;
        return origin + url;
      } catch (e) {}
    }
    return url;
  }

  /**
   * Hydrates Storefront DOM with sanitized profile data
   */
  function hydrateStorefront(profile, apiBase) {
    if (!profile) return;

    // Cache globally for shop-cart.js
    global.__SG_SITE_PROFILE__ = profile;

    // 1. Title & Meta
    if (profile.seo && profile.seo.title) {
      document.title = profile.seo.title;
    } else if (profile.site_name) {
      document.title = profile.site_name + ' | ' + (profile.site_name_th || 'เอสจี ผลไม้ตามฤดูกาล') + ' — ' + (profile.tagline || 'Shop the Season');
    }

    if (profile.seo && profile.seo.description) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', profile.seo.description);
    }

    // 2. Header Brand
    if (profile.site_name) safeSetText('.brand-name', profile.site_name);
    if (profile.site_name_th) safeSetText('.brand-sub', profile.site_name_th);
    if (profile.logo_url && isValidUrl(profile.logo_url)) {
      safeSetAttr('.brand-logo-img', 'src', resolveAssetUrl(profile.logo_url, apiBase));
    }

    // 3. Footer Brand
    if (profile.site_name) safeSetText('.footer-brand strong', profile.site_name);
    if (profile.site_name_th) safeSetText('.footer-brand-th', profile.site_name_th);
    if (profile.tagline) safeSetText('.footer-brand-group', profile.tagline);
    if (profile.footer && profile.footer.about) {
      safeSetText('.footer-desc', profile.footer.about);
    } else if (profile.description) {
      safeSetText('.footer-desc', profile.description);
    }

    // 4. Contact & LINE OA
    if (profile.line_oa_id) {
      safeSetText('.footer-contact-list a[href*="line.me"]', profile.line_oa_id);
    }
    if (profile.line_oa_url && isValidUrl(profile.line_oa_url)) {
      safeSetAttr('.footer-contact-list a[href*="line.me"]', 'href', profile.line_oa_url);
    }

    if (profile.phone) {
      safeSetText('.footer-contact-list a[href*="tel:"]', profile.phone);
      safeSetAttr('.footer-contact-list a[href*="tel:"]', 'href', 'tel:' + profile.phone.replace(/[^0-9+]/g, ''));
    }

    if (profile.business_hours) {
      safeSetText('.footer-contact-list a[href*="tel:"] + small', profile.business_hours);
    }

    // 5. Footer Copyright
    if (profile.footer && profile.footer.copyright) {
      safeSetText('.footer-bottom > div:first-child', profile.footer.copyright);
    }

    // 6. Announcement Bar
    if (profile.announcement) {
      renderAnnouncementBar(profile.announcement);
    }
  }

  /**
   * Main Initialization: Non-blocking Progressive Enhancement
   */
  async function initSiteProfile() {
    // If backend adapter provides an API base, use it; else fallback to relative /api
    let apiBase = '/api';
    if (global.SGStorefrontApi && typeof global.SGStorefrontApi.getApiBaseUrl === 'function' && global.SGStorefrontApi.getApiBaseUrl()) {
      apiBase = global.SGStorefrontApi.getApiBaseUrl();
    } else if (global.location) {
      const hostname = (global.location.hostname || '').toLowerCase();
      if (hostname.includes('staging.siriwatmedhanin.com') || hostname.includes('sg-fruit-storefront-staging.pages.dev')) {
        apiBase = 'https://staging-api.siriwatmedhanin.com/api';
      } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
        apiBase = 'http://127.0.0.1:8787/api';
      }
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(function () {
        controller.abort();
      }, 3000); // 3 second timeout for safe fallback

      const res = await fetch(apiBase + '/site-profile', {
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (json.ok && json.data) {
          hydrateStorefront(json.data, apiBase);
          return;
        }
      }
    } catch (err) {
      // Non-blocking safe fallback: API offline or timed out
      // Retain hardcoded HTML cleanly
    }

    // Cache fallback defaults
    global.__SG_SITE_PROFILE__ = DEFAULTS;
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSiteProfile);
  } else {
    initSiteProfile();
  }

})(typeof window !== 'undefined' ? window : this);
