// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

const SITE_URL = process.env.SITE_URL ?? 'http://localhost:8096';

/**
 * Astro `checkOrigin` membandingkan header Origin dengan `url.origin`. Di belakang
 * Nginx/tunnel, koneksi ke Node masih HTTP; tanpa allowedDomains header
 * X-Forwarded-Proto diabaikan sehingga Origin `https://…` ≠ `http://…` → 403 POST.
 */
/** @param {string} siteUrl */
function allowedDomainsDariSiteUrl(siteUrl) {
  /** @type {Array<{ hostname?: string; protocol?: string; port?: string }>} */
  const pola = [];
  try {
    const u = new URL(siteUrl);
    // Host SITE_URL tidak dijadikan pola saat masih localhost (konfigurasi dev
    // di host), tapi itu bukan alasan berhenti: SECURITY_ALLOWED_HOST tetap
    // harus dibaca di bawah supaya bisa memercayai X-Forwarded-Proto dari
    // tunnel/nginx.
    if (u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') {
      /** @type {{ hostname: string; protocol?: string; port?: string }} */
      const satu = { hostname: u.hostname };
      if (u.protocol === 'https:') satu.protocol = 'https';
      else if (u.protocol === 'http:') satu.protocol = 'http';
      if (u.port) satu.port = u.port;
      pola.push(satu);
    }
  } catch {
    /* SITE_URL tidak valid — biarkan kosong */
  }
  const liar = process.env.SECURITY_ALLOWED_HOST?.trim();
  if (liar) {
    /** @type {{ hostname: string; protocol?: string }} */
    const ekstra = { hostname: liar };
    if (siteUrl.startsWith('https://')) ekstra.protocol = 'https';
    pola.push(ekstra);
  }
  return pola;
}

const allowedDomains = allowedDomainsDariSiteUrl(SITE_URL);

export default defineConfig({
  site: SITE_URL,
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  trailingSlash: 'ignore',
  compressHTML: true,
  security: {
    checkOrigin: true,
    ...(allowedDomains.length > 0 ? { allowedDomains } : {}),
  },
  build: {
    assets: '_astro',
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      cssMinify: 'lightningcss',
    },
  },
  devToolbar: { enabled: false },
});