module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  return {
    ...config,
    extra: {
      ...config.extra,
      ...(apiUrl ? { apiUrl } : {})
    },
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        ...(googleMapsApiKey
          ? {
              googleMaps: {
                ...config.android?.config?.googleMaps,
                apiKey: googleMapsApiKey
              }
            }
          : {})
      }
    }
  };
};
