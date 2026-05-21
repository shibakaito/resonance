/** @type {import('next').NextConfig} */
const nextConfig = {
  // 이전 작업 중 임시: 빌드 시 ESLint는 건너뜀(라우팅 이전 완료 후 정리 예정)
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
