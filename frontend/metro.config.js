const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// @supabase/supabase-js dynamically imports @opentelemetry/api which isn't installed.
// Stub it out — Supabase already handles the failure gracefully with .catch(() => null).
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@opentelemetry/api') {
    return {
      filePath: path.resolve(__dirname, 'stubs/opentelemetry-api.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
