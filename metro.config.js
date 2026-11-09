const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// 'mp3' is already a default asset extension; resolution is case-sensitive, so
// the capitalised 'MP3' used by assets/audio/sfx still has to be added.
config.resolver.assetExts = [...config.resolver.assetExts, 'ogg', 'MP3'];

// The stream service marks import as components, so .svg leaves the asset
// extensions and is handed to the transformer instead of copied as an opaque
// file. The `/expo` entry keeps Expo's own Babel pipeline in front of it.
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer/expo');
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts.push('svg');

module.exports = config;
