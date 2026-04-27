import { registerRootComponent } from 'expo';
import { enableFreeze } from 'react-native-screens';

// Disable react-native-screens freeze behavior. The freeze layer can briefly
// disconnect React Navigation's NavigationStateContext provider during
// re-renders, causing "Couldn't find a navigation context" errors when
// children call navigation hooks during cleanup. See
// useNavigationBuilder.tsx cleanup (getKey() outside provider).
enableFreeze(false);

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
