import { View, ViewProps } from 'react-native';

export type ThemedViewProps = ViewProps;

export function ThemedView({ style, ...rest }: ThemedViewProps) {
  return <View style={[{ backgroundColor: '#FFFFFF' }, style]} {...rest} />;
}
