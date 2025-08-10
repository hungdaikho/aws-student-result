/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration pour l'upload de fichiers et optimisation
  experimental: {
    serverComponentsExternalPackages: ["xlsx"],
  },

  // Configuration pour la production
  // Active le mode standalone uniquement quand demandé (pour empaquetage zip / déploiement custom)
  output: process.env.EXPORT_STATIC === 'true'
    ? 'export'
    : (process.env.STANDALONE === 'true' ? 'standalone' : undefined),

  // Optimisation des images
  images: {
    unoptimized: true,
  },

  // Disable all caching for development and debugging
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },

  // Disable build cache
  generateBuildId: async () => {
    return Date.now().toString();
  },
  // Webpack configuration to handle potential build issues
  webpack: (config, { isServer }) => {
    // Handle WebAssembly files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      syncWebAssembly: true,
    };

    // Optimize for build performance
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }

    return config;
  },

  // Headers pour CORS et sécurité
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
          // Disable caching headers
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
          { key: "Surrogate-Control", value: "no-store" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          // Disable caching for all pages
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
    ];
  },

  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: true,
  },

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
