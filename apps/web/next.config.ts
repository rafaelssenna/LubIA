import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['nfewizard-io', '@nfewizard/danfe', '@nfewizard/shared', 'xsd-schema-validator', 'xml2js', 'libxmljs2', 'pdfkit', 'pg'],
};

export default nextConfig;
