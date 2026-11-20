import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const dbPath = path.join(ROOT_DIR, 'node_modules', 'thai-address-database', 'database', 'db.json');
if (!fs.existsSync(dbPath)) {
  console.error('db.json not found in node_modules/thai-address-database/database/db.json');
  process.exit(1);
}

const rawData = fs.readFileSync(dbPath, 'utf8').trim();

const jsContent = `/**
 * SG FRUIT — Thai Address Autocomplete Module (77 Provinces Offline Database)
 * Standalone, zero external API dependencies, instant local memory search.
 */
(function (global) {
  'use strict';

  var RAW_DB = ${rawData};

  var database = null;

  function preprocess(data) {
    var lookup = [];
    var words = [];
    var expanded = [];
    var useLookup = false;
    var t;
    if (data.lookup && data.words) {
      useLookup = true;
      lookup = data.lookup.split('|');
      words = data.words.split('|');
      data = data.data;
    }
    t = function (text) {
      function repl(m) {
        var ch = m.charCodeAt(0);
        return words[ch < 97 ? ch - 65 : 26 + ch - 97];
      }
      if (!useLookup) return text;
      if (typeof text === 'number') text = lookup[text];
      return text.replace(/[A-Z]/ig, repl);
    };
    if (!data[0].length) return data;
    data.forEach(function (provinces) {
      var i = 1;
      if (provinces.length === 3) i = 2;
      provinces[i].forEach(function (amphoes) {
        amphoes[i].forEach(function (districts) {
          var zips = districts[i] instanceof Array ? districts[i] : [districts[i]];
          zips.forEach(function (zipcode) {
            expanded.push({
              district: t(districts[0]),
              amphoe: t(amphoes[0]),
              province: t(provinces[0]),
              zipcode: String(zipcode)
            });
          });
        });
      });
    });
    return expanded;
  }

  function getDB() {
    if (!database) {
      database = preprocess(RAW_DB);
    }
    return database;
  }

  function search(query, fieldType, limit) {
    fieldType = fieldType || 'all';
    limit = limit || 12;
    var q = String(query || '').trim().toLowerCase();
    if (!q) return [];

    var db = getDB();
    var isDigit = /^[0-9]+$/.test(q);
    var results = [];

    for (var i = 0; i < db.length; i++) {
      var item = db[i];
      var score = 0;

      if (isDigit) {
        var zip = item.zipcode;
        if (zip === q) score = 100;
        else if (zip.startsWith(q)) score = 80;
        else if (zip.includes(q)) score = 40;
      } else {
        var d = item.district.toLowerCase();
        var a = item.amphoe.toLowerCase();
        var p = item.province.toLowerCase();

        if (fieldType === 'district') {
          if (d === q) score = 100;
          else if (d.startsWith(q)) score = 80;
          else if (d.includes(q)) score = 60;
          else if (a.startsWith(q) || p.startsWith(q)) score = 25;
        } else if (fieldType === 'amphoe') {
          if (a === q) score = 100;
          else if (a.startsWith(q)) score = 80;
          else if (a.includes(q)) score = 60;
          else if (d.startsWith(q) || p.startsWith(q)) score = 25;
        } else if (fieldType === 'province') {
          if (p === q) score = 100;
          else if (p.startsWith(q)) score = 80;
          else if (p.includes(q)) score = 60;
          else if (d.startsWith(q) || a.startsWith(q)) score = 25;
        } else {
          if (d === q || a === q || p === q) score = 100;
          else if (d.startsWith(q) || a.startsWith(q) || p.startsWith(q)) score = 70;
          else if (d.includes(q) || a.includes(q) || p.includes(q)) score = 40;
        }
      }

      if (score > 0) {
        results.push({ item: item, score: score });
      }
    }

    results.sort(function (x, y) { return y.score - x.score; });

    var seen = new Set();
    var deduped = [];
    for (var k = 0; k < results.length; k++) {
      var itm = results[k].item;
      var key = itm.district + '|' + itm.amphoe + '|' + itm.province + '|' + itm.zipcode;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(itm);
        if (deduped.length >= limit) break;
      }
    }

    return deduped;
  }

  var activeDropdown = null;

  function closeAllDropdowns() {
    if (activeDropdown && activeDropdown.parentNode) {
      activeDropdown.parentNode.removeChild(activeDropdown);
    }
    activeDropdown = null;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function bindAutocomplete(options) {
    if (!options) return;
    var subdistrictEl = options.subdistrictEl;
    var districtEl = options.districtEl;
    var provinceEl = options.provinceEl;
    var postalEl = options.postalEl;
    var onSelect = options.onSelect;

    var isSelecting = false;

    var fields = [
      { el: subdistrictEl, type: 'district', label: 'ตำบล/แขวง' },
      { el: districtEl, type: 'amphoe', label: 'อำเภอ/เขต' },
      { el: provinceEl, type: 'province', label: 'จังหวัด' },
      { el: postalEl, type: 'postal', label: 'รหัสไปรษณีย์' }
    ];

    fields.forEach(function (f) {
      if (!f.el) return;

      var parentField = f.el.closest('.checkout-field') || f.el.parentNode;

      function renderDropdown(items) {
        closeAllDropdowns();
        if (!items || items.length === 0 || isSelecting) return;

        var dropdown = document.createElement('div');
        dropdown.className = 'thai-address-dropdown';
        dropdown.setAttribute('role', 'listbox');
        dropdown.setAttribute('aria-label', 'รายการที่อยู่ประเทศไทย');

        items.forEach(function (item) {
          var row = document.createElement('div');
          row.className = 'thai-address-dropdown-item';
          row.setAttribute('role', 'option');
          row.setAttribute('tabindex', '0');

          row.innerHTML =
            '<div class="thai-address-item-crumbs">' +
              '<span class="thai-address-crumb-district">' + escapeHtml(item.district) + '</span>' +
              '<span class="thai-address-crumb-sep">›</span>' +
              '<span class="thai-address-crumb-amphoe">' + escapeHtml(item.amphoe) + '</span>' +
              '<span class="thai-address-crumb-sep">›</span>' +
              '<span class="thai-address-crumb-province">' + escapeHtml(item.province) + '</span>' +
            '</div>' +
            '<span class="thai-address-zip-pill">' + escapeHtml(item.zipcode) + '</span>';

          function selectItem(e) {
            if (e) {
              e.preventDefault();
              e.stopPropagation();
            }

            isSelecting = true;
            closeAllDropdowns();

            // 1. Fill all 4 fields
            if (subdistrictEl) subdistrictEl.value = item.district;
            if (districtEl) districtEl.value = item.amphoe;
            if (provinceEl) provinceEl.value = item.province;
            if (postalEl) postalEl.value = item.zipcode;

            // 2. Clear invalid states
            [subdistrictEl, districtEl, provinceEl, postalEl].forEach(function (input) {
              if (input) input.classList.remove('is-invalid');
            });

            // 3. Callback
            if (typeof onSelect === 'function') {
              onSelect(item);
            }

            // 4. Trigger change events without re-triggering dropdown
            [subdistrictEl, districtEl, provinceEl, postalEl].forEach(function (input) {
              if (input) {
                var evt = new Event('change', { bubbles: true });
                input.dispatchEvent(evt);
              }
            });

            setTimeout(function () {
              isSelecting = false;
              closeAllDropdowns();
            }, 100);
          }

          row.addEventListener('mousedown', selectItem);
          row.addEventListener('touchstart', selectItem, { passive: false });
          row.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
              selectItem(e);
            }
          });

          dropdown.appendChild(row);
        });

        parentField.appendChild(dropdown);
        activeDropdown = dropdown;
      }

      var debounceTimer = null;
      f.el.addEventListener('input', function () {
        if (isSelecting) return;
        clearTimeout(debounceTimer);
        var val = f.el.value.trim();
        if (!val || val.length < 1) {
          closeAllDropdowns();
          return;
        }

        debounceTimer = setTimeout(function () {
          if (isSelecting) return;
          var matched = search(val, f.type, 12);
          renderDropdown(matched);
        }, 30);
      });

      f.el.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          closeAllDropdowns();
        } else if (e.key === 'ArrowDown') {
          if (activeDropdown) {
            var firstItem = activeDropdown.querySelector('.thai-address-dropdown-item');
            if (firstItem) {
              e.preventDefault();
              firstItem.focus();
            }
          }
        }
      });
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.thai-address-dropdown') && !e.target.closest('.checkout-field')) {
        closeAllDropdowns();
      }
    });

    document.addEventListener('touchstart', function (e) {
      if (!e.target.closest('.thai-address-dropdown') && !e.target.closest('.checkout-field')) {
        closeAllDropdowns();
      }
    }, { passive: true });
  }

  global.THAI_ADDRESS_AUTOCOMPLETE = {
    getDB: getDB,
    search: search,
    bindAutocomplete: bindAutocomplete,
    closeAllDropdowns: closeAllDropdowns
  };
})(typeof window !== 'undefined' ? window : this);
`;

const outputPath = path.join(ROOT_DIR, 'js', 'thai-address.js');
fs.writeFileSync(outputPath, jsContent, 'utf8');
console.log('Successfully generated js/thai-address.js! File size:', fs.statSync(outputPath).size, 'bytes');
