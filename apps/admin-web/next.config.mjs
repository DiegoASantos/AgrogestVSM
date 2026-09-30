const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const internalApiUrl = process.env.API_INTERNAL_URL?.trim();

if (apiBaseUrl === "/api" && !internalApiUrl) {
  throw new Error("API_INTERNAL_URL is required when NEXT_PUBLIC_API_URL=/api.");
}

if (apiBaseUrl === "/api") {
  const target = new URL(internalApiUrl);

  if (
    !["http:", "https:"].includes(target.protocol) ||
    target.username ||
    target.password ||
    target.pathname !== "/" ||
    target.search ||
    target.hash
  ) {
    throw new Error(
      "API_INTERNAL_URL must be an HTTP(S) origin without a path or credentials."
    );
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true
};

export default nextConfig;
