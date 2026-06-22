import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Bin Night',
    short_name: 'Bin Night',
    description: 'Monash Council bin collection schedule',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f1f5f9',
    theme_color: '#f59e0b',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
