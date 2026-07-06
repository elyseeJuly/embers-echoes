import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteStaticCopy } from 'vite-plugin-static-copy'

import { cloudflare } from "@cloudflare/vite-plugin";

const basePath = process.env.CF_PAGES === '1'
  ? '/'
  : (process.env.GITHUB_ACTIONS === 'true' ? '/embers-echoes/' : './');

export default defineConfig({
  plugins: [viteStaticCopy({
    targets: [
      { src: 'script', dest: '.' },
      { src: 'css', dest: '.' },
      { src: 'lib', dest: '.' },
      { src: 'audio', dest: '.' },
      { src: 'lang', dest: '.' },
      { src: 'icons', dest: '.' },
      { src: 'favicon.png', dest: '.' },
    ]
  }), VitePWA({
    registerType: 'prompt',
    includeAssets: [
      'icons/*.png',
      'favicon.png',
    ],
    manifest: {
      name: '余烬回响',
      short_name: '余烬回响',
      description: '一个关于余烬、理智与存在的渐进式文字冒险',
      lang: 'zh-CN',
      display: 'standalone',
      orientation: 'landscape',
      theme_color: '#0a0a0f',
      background_color: '#0a0a0f',
      start_url: basePath,
      scope: basePath,
      icons: [
        {
          src: 'icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: 'icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: 'icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,json,woff2,woff,ttf,eot,svg}'],
      runtimeCaching: [
        {
          urlPattern: /\/audio\/.*\.(flac|mp3|ogg|wav)/i,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'game-audio',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 * 24 * 90
            }
          }
        },
        {
          urlPattern: /\/images\/.*\.(png|webp|jpg|jpeg|gif)/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'game-images',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 * 90
            }
          }
        },
        {
          urlPattern: /\/fonts\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'game-fonts',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 365
            }
          }
        },
        {
          urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 365
            }
          }
        }
      ],
      cacheId: 'embers-echoes-v1.0.0',
      cleanupOutdatedCaches: true
    }
  }), cloudflare()],
  base: basePath,
  build: {
    sourcemap: false,
    rollupOptions: {
      input: {
        main: './index.html',
      }
    }
  }
})