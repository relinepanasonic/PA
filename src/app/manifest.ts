import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Personal Assistant AI',
    short_name: 'PersonalAssist',
    description: 'AI Personal Assistant Dashboard for tasks, finances, and sports tracking.',
    start_url: '/',
    display: 'standalone',
    background_color: '#040814',
    theme_color: '#040814',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png?v=2',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo.png?v=2',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo.png?v=2',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
