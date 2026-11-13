/* global jest */
// react-native-keyboard-controller is a native module with no native side
// under Jest; its own mock stands in for it.
jest.mock('react-native-keyboard-controller', () => require('react-native-keyboard-controller/jest'));
