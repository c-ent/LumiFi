const { withAndroidManifest } = require('expo/config-plugins');

// The session-end alarm needs an exact alarm. Android has two permissions for it:
//
// - USE_EXACT_ALARM (Android 13 and up): granted at install, for apps whose
//   core job is a timer, alarm or calendar. Wickglow's is.
// - SCHEDULE_EXACT_ALARM (Android 12 and 12L): the only one that exists there.
//
// Declared with no upper limit, SCHEDULE_EXACT_ALARM also applies on Android 13
// and up, where it adds an "Alarms & reminders" special-access switch the user
// can turn off and that Wickglow does not need. Capping it at API 32 keeps it to
// the two versions that have nothing else, which is the pairing Android's
// documentation describes. `app.json` cannot express a maxSdkVersion, so the
// attribute is set here.
const PERMISSION = 'android.permission.SCHEDULE_EXACT_ALARM';
const LAST_SDK_WITHOUT_USE_EXACT_ALARM = '32';

module.exports = function withExactAlarmMaxSdk(config) {
  return withAndroidManifest(config, (manifest) => {
    const root = manifest.modResults.manifest;
    const entries = root['uses-permission'] ?? [];
    let found = false;
    for (const entry of entries) {
      if (entry.$?.['android:name'] !== PERMISSION) continue;
      entry.$['android:maxSdkVersion'] = LAST_SDK_WITHOUT_USE_EXACT_ALARM;
      found = true;
    }
    if (!found) {
      entries.push({ $: { 'android:name': PERMISSION, 'android:maxSdkVersion': LAST_SDK_WITHOUT_USE_EXACT_ALARM } });
      root['uses-permission'] = entries;
    }
    return manifest;
  });
};
