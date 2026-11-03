const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// 'mp3' is already a default asset extension; resolution is case-sensitive, so
// the capitalised 'MP3' used by assets/audio/sfx still has to be added.
config.resolver.assetExts = [...config.resolver.assetExts, 'ogg', 'MP3'];

module.exports = config;
