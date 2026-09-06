import React from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

/**
 * The one way this app handles the keyboard.
 *
 * Wrap any screen containing text inputs in this. It keeps the focused field
 * above the keyboard on both platforms and scrolls to reach it, which is what
 * every hand-rolled attempt in this codebase was trying and failing to do.
 *
 * Why not KeyboardAvoidingView: it only pads or resizes its own container, so
 * a field further down a scrolling form stays hidden. It also behaves
 * differently per platform — "height" on Android is the least reliable mode —
 * and Android edge-to-edge, which this app enables, makes it worse. The native
 * keyboard tracking used here follows the keyboard frame instead of guessing.
 *
 * Do not pair this with KeyboardAvoidingView; two things fighting over the
 * same offset is worse than either alone.
 */
type ScrollProps = React.ComponentProps<typeof KeyboardAwareScrollView>;

/**
 * Accepts everything the underlying scroll view does, so a screen can still
 * set contentContainerStyle, keyboardShouldPersistTaps and the rest. The
 * defaults below apply unless a screen overrides them deliberately.
 */
interface KeyboardAwareScreenProps extends ScrollProps {
  children: React.ReactNode;
}

export const KeyboardAwareScreen: React.FC<KeyboardAwareScreenProps> = ({
  children,
  // Roughly one input's height, so the focused field is never flush against
  // the keyboard and the next field stays partly visible.
  bottomOffset = 24,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
  // Let a tap on a button register on the first press while the keyboard is
  // open, instead of the first tap only dismissing it.
  keyboardShouldPersistTaps = 'handled',
  // Dragging the content closes the keyboard, which is what people expect.
  keyboardDismissMode = 'interactive',
  ...rest
}) => (
  <KeyboardAwareScrollView
    bottomOffset={bottomOffset}
    showsVerticalScrollIndicator={showsVerticalScrollIndicator}
    keyboardShouldPersistTaps={keyboardShouldPersistTaps}
    keyboardDismissMode={keyboardDismissMode}
    // flexGrow rather than flex so short forms still fill the screen while
    // long ones remain scrollable.
    contentContainerStyle={[{ flexGrow: 1 }, contentContainerStyle]}
    {...rest}
  >
    {children}
  </KeyboardAwareScrollView>
);
