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
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
    ],
  };
}
