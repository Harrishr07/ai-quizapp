import { type MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AI Quiz App',
    short_name: 'AI Quiz',
    description: 'AI-powered quiz generator with history and analytics.',
    start_url: '/',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#2563eb',
    icons: [
      {
        src: '/next.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
      },
      {
        src: '/next.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
      },
    ],
  };
}
