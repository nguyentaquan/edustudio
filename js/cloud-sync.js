// ============================================================================
// EDUSTUDIO CLOUD SYNC SERVICE (Bước 2: Đồng bộ Đa Máy trên Vercel Static)
// Hỗ trợ: Firebase Firestore REST API (mặc định: edustudio-514503) & Supabase
// ============================================================================
(function () {
    const STORAGE_KEY = 'edustudio_cloud_config';
    const WORKSPACE_KEYS = [
        'edustudio_custom_games',
        'edustudio_custom_ppts',
        'edustudio_custom_lesson_plans',
        'edustudio_custom_exams',
        'edustudio_custom_videos',
        'edustudio_custom_labs'
    ];

    function sanitizeDocId(email) {
        return String(email || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '_');
    }

    function toFirestoreValue(val) {
        if (val === null || val === undefined) return { nullValue: null };
        if (typeof val === 'boolean') return { booleanValue: val };
        if (typeof val === 'number') {
            return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
        }
        if (typeof val === 'string') return { stringValue: val };
        if (Array.isArray(val)) {
            return { arrayValue: { values: val.map(toFirestoreValue) } };
        }
        if (typeof val === 'object') {
            const fields = {};
            for (const k of Object.keys(val)) {
                fields[k] = toFirestoreValue(val[k]);
            }
            return { mapValue: { fields } };
        }
        return { stringValue: String(val) };
    }

    function fromFirestoreValue(v) {
        if (!v || typeof v !== 'object') return null;
        if ('nullValue' in v) return null;
        if ('booleanValue' in v) return v.booleanValue;
        if ('integerValue' in v) return parseInt(v.integerValue, 10);
        if ('doubleValue' in v) return Number(v.doubleValue);
        if ('stringValue' in v) return v.stringValue;
        if ('arrayValue' in v) {
            return (v.arrayValue.values || []).map(fromFirestoreValue);
        }
        if ('mapValue' in v) {
            const out = {};
            const fields = v.mapValue.fields || {};
            for (const k of Object.keys(fields)) {
                out[k] = fromFirestoreValue(fields[k]);
            }
            return out;
        }
        return null;
    }

    function fromFirestoreDoc(doc) {
        if (!doc || !doc.fields) return null;
        const obj = {};
        for (const k of Object.keys(doc.fields)) {
            obj[k] = fromFirestoreValue(doc.fields[k]);
        }
        return obj;
    }

    function toFirestoreDoc(obj) {
        const fields = {};
        for (const k of Object.keys(obj || {})) {
            if (obj[k] !== undefined) {
                fields[k] = toFirestoreValue(obj[k]);
            }
        }
        return { fields };
    }

    window.eduCloudSync = {
        WORKSPACE_KEYS,

        getConfig() {
            const def = window.EDUSTUDIO_DEFAULT_CLOUD_CONFIG || {
                provider: 'firebase',
                projectId: 'edustudio-514503',
                apiKey: ''
            };
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    return {
                        provider: parsed.provider || def.provider || 'firebase',
                        projectId: (parsed.projectId !== undefined ? parsed.projectId : def.projectId || '').trim(),
                        apiKey: (parsed.apiKey !== undefined ? parsed.apiKey : def.apiKey || '').trim()
                    };
                }
            } catch (e) {}
            return {
                provider: def.provider || 'firebase',
                projectId: (def.projectId || '').trim(),
                apiKey: (def.apiKey || '').trim()
            };
        },

        saveConfig(cfg) {
            const clean = {
                provider: (cfg?.provider || 'firebase').trim(),
                projectId: (cfg?.projectId || '').trim(),
                apiKey: (cfg?.apiKey || '').trim()
            };
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
            } catch (e) {}
            return clean;
        },

        isConfigured() {
            const cfg = this.getConfig();
            return Boolean(cfg.projectId && cfg.apiKey);
        },

        async fetchUser(email) {
            if (!this.isConfigured() || !email) return null;
            const cfg = this.getConfig();
            const cleanEmail = email.trim().toLowerCase();
            try {
                if (cfg.provider === 'supabase') {
                    const base = cfg.projectId.replace(/\/+$/, '');
                    const res = await fetch(`${base}/rest/v1/edustudio_users?email=eq.${encodeURIComponent(cleanEmail)}&limit=1`, {
                        headers: { apikey: cfg.apiKey, Authorization: `Bearer ${cfg.apiKey}` }
                    });
                    if (!res.ok) return null;
                    const rows = await res.json();
                    return Array.isArray(rows) && rows[0] ? rows[0] : null;
                }
                const docId = sanitizeDocId(cleanEmail);
                const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(cfg.projectId)}/databases/(default)/documents/edustudio_users/${encodeURIComponent(docId)}?key=${encodeURIComponent(cfg.apiKey)}`;
                const res = await fetch(url);
                if (!res.ok) return null;
                const doc = await res.json();
                return fromFirestoreDoc(doc);
            } catch (e) {
                console.warn('[CloudSync] fetchUser error:', e.message);
                return null;
            }
        },

        async upsertUser(user) {
            if (!this.isConfigured() || !user || !user.email) return false;
            const cfg = this.getConfig();
            const cleanEmail = user.email.trim().toLowerCase();
            const safeUser = {
                id: user.id || ('user_' + sanitizeDocId(cleanEmail)),
                email: cleanEmail,
                name: user.name || cleanEmail.split('@')[0],
                picture: user.picture || '',
                role: user.role || 'member',
                points: Number(user.points ?? 100),
                demoUses: Number(user.demoUses ?? 20),
                school: user.school || '',
                subject: user.subject || '',
                grade: user.grade || 'thcs',
                avatar: user.avatar || user.avatarEmoji || (user.role === 'admin' ? '👑' : '👨‍🏫'),
                lastLogin: user.lastLogin || new Date().toISOString(),
                authProvider: user.authProvider || 'google_oauth',
                updatedAt: new Date().toISOString()
            };
            try {
                if (cfg.provider === 'supabase') {
                    const base = cfg.projectId.replace(/\/+$/, '');
                    const res = await fetch(`${base}/rest/v1/edustudio_users`, {
                        method: 'POST',
                        headers: {
                            apikey: cfg.apiKey,
                            Authorization: `Bearer ${cfg.apiKey}`,
                            'Content-Type': 'application/json',
                            Prefer: 'resolution=merge-duplicates'
                        },
                        body: JSON.stringify(safeUser)
                    });
                    return res.ok;
                }
                const docId = sanitizeDocId(cleanEmail);
                const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(cfg.projectId)}/databases/(default)/documents/edustudio_users/${encodeURIComponent(docId)}?key=${encodeURIComponent(cfg.apiKey)}`;
                const res = await fetch(url, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(toFirestoreDoc(safeUser))
                });
                return res.ok;
            } catch (e) {
                console.warn('[CloudSync] upsertUser error:', e.message);
                return false;
            }
        },

        async listAllUsers() {
            if (!this.isConfigured()) return [];
            const cfg = this.getConfig();
            try {
                if (cfg.provider === 'supabase') {
                    const base = cfg.projectId.replace(/\/+$/, '');
                    const res = await fetch(`${base}/rest/v1/edustudio_users?select=*`, {
                        headers: { apikey: cfg.apiKey, Authorization: `Bearer ${cfg.apiKey}` }
                    });
                    if (!res.ok) return [];
                    const rows = await res.json();
                    return Array.isArray(rows) ? rows : [];
                }
                const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(cfg.projectId)}/databases/(default)/documents/edustudio_users?pageSize=200&key=${encodeURIComponent(cfg.apiKey)}`;
                const res = await fetch(url);
                if (!res.ok) return [];
                const data = await res.json();
                return (data.documents || []).map(fromFirestoreDoc).filter(Boolean);
            } catch (e) {
                console.warn('[CloudSync] listAllUsers error:', e.message);
                return [];
            }
        },

        async syncCurrentUserWorkspace(email) {
            if (!this.isConfigured() || !email) return false;
            const cfg = this.getConfig();
            const cleanEmail = email.trim().toLowerCase();
            const payload = { email: cleanEmail, updatedAt: new Date().toISOString() };
            WORKSPACE_KEYS.forEach((k) => {
                try {
                    payload[k] = localStorage.getItem(k) || '[]';
                } catch (e) {
                    payload[k] = '[]';
                }
            });
            try {
                if (cfg.provider === 'supabase') {
                    const base = cfg.projectId.replace(/\/+$/, '');
                    const res = await fetch(`${base}/rest/v1/edustudio_workspaces`, {
                        method: 'POST',
                        headers: {
                            apikey: cfg.apiKey,
                            Authorization: `Bearer ${cfg.apiKey}`,
                            'Content-Type': 'application/json',
                            Prefer: 'resolution=merge-duplicates'
                        },
                        body: JSON.stringify(payload)
                    });
                    return res.ok;
                }
                const docId = sanitizeDocId(cleanEmail);
                const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(cfg.projectId)}/databases/(default)/documents/edustudio_workspaces/${encodeURIComponent(docId)}?key=${encodeURIComponent(cfg.apiKey)}`;
                const res = await fetch(url, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(toFirestoreDoc(payload))
                });
                return res.ok;
            } catch (e) {
                console.warn('[CloudSync] syncWorkspace error:', e.message);
                return false;
            }
        },

        async loadUserWorkspace(email) {
            if (!this.isConfigured() || !email) return false;
            const cfg = this.getConfig();
            const cleanEmail = email.trim().toLowerCase();
            try {
                let record = null;
                if (cfg.provider === 'supabase') {
                    const base = cfg.projectId.replace(/\/+$/, '');
                    const res = await fetch(`${base}/rest/v1/edustudio_workspaces?email=eq.${encodeURIComponent(cleanEmail)}&limit=1`, {
                        headers: { apikey: cfg.apiKey, Authorization: `Bearer ${cfg.apiKey}` }
                    });
                    if (res.ok) {
                        const rows = await res.json();
                        record = Array.isArray(rows) && rows[0] ? rows[0] : null;
                    }
                } else {
                    const docId = sanitizeDocId(cleanEmail);
                    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(cfg.projectId)}/databases/(default)/documents/edustudio_workspaces/${encodeURIComponent(docId)}?key=${encodeURIComponent(cfg.apiKey)}`;
                    const res = await fetch(url);
                    if (res.ok) {
                        record = fromFirestoreDoc(await res.json());
                    }
                }
                if (!record) return false;
                WORKSPACE_KEYS.forEach((k) => {
                    if (typeof record[k] === 'string' && record[k].startsWith('[')) {
                        try {
                            const remoteArr = JSON.parse(record[k]);
                            const localArr = JSON.parse(localStorage.getItem(k) || '[]');
                            if (Array.isArray(remoteArr) && remoteArr.length > 0) {
                                const merged = [...remoteArr];
                                (Array.isArray(localArr) ? localArr : []).forEach((item) => {
                                    if (item && item.id && !merged.some(m => m.id === item.id)) {
                                        merged.push(item);
                                    }
                                });
                                localStorage.setItem(k, JSON.stringify(merged.slice(0, 50)));
                            }
                        } catch (e) {}
                    }
                });
                return true;
            } catch (e) {
                console.warn('[CloudSync] loadWorkspace error:', e.message);
                return false;
            }
        },

        async testConnection() {
            const cfg = this.getConfig();
            if (!cfg.projectId || !cfg.apiKey) {
                return { ok: false, message: 'Chưa nhập đủ Project ID / URL và API Key!' };
            }
            try {
                if (cfg.provider === 'supabase') {
                    const base = cfg.projectId.replace(/\/+$/, '');
                    const res = await fetch(`${base}/rest/v1/edustudio_users?select=email&limit=1`, {
                        headers: { apikey: cfg.apiKey, Authorization: `Bearer ${cfg.apiKey}` }
                    });
                    if (res.ok) return { ok: true, message: 'Kết nối Supabase thành công!' };
                    return { ok: false, message: `Supabase lỗi HTTP ${res.status}` };
                }
                const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(cfg.projectId)}/databases/(default)/documents/edustudio_users?pageSize=1&key=${encodeURIComponent(cfg.apiKey)}`;
                const res = await fetch(url);
                if (res.ok) return { ok: true, message: `Kết nối Firebase Firestore (${cfg.projectId}) thành công!` };
                const err = await res.json().catch(() => ({}));
                return { ok: false, message: `Firestore HTTP ${res.status}: ${err?.error?.message || 'Kiểm tra lại Rules hoặc API Key'}` };
            } catch (e) {
                return { ok: false, message: 'Lỗi mạng: ' + e.message };
            }
        }
    };
})();
