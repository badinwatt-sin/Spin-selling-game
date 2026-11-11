import type { NextConfig } from 'next';
const config:NextConfig = {outputFileTracingIncludes:{'/api/card':['./private/cards/*.jpeg']}};
export default config;
