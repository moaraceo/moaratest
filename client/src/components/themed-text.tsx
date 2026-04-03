import { Text, TextProps } from 'react-native';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'subtitle' | 'link';
};

export function ThemedText({ style, type = 'default', ...rest }: ThemedTextProps) {
  return (
    <Text
      style={[
        { color: '#000000' },
        type === 'title' && { fontSize: 24, fontWeight: 'bold' },
        type === 'subtitle' && { fontSize: 18, fontWeight: '600' },
        type === 'link' && { color: '#007AFF', textDecorationLine: 'underline' },
        style,
      ]}
      {...rest}
    />
  );
}
