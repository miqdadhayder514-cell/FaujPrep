/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        destination: "https://faujprep.issb.workers.dev/:path*",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
