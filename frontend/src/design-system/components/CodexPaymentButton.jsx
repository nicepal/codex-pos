import CodexButton from './CodexButton';
import { CODEX_TOKENS } from '../theme/codexTheme';

/** Large payment CTA used in cart / tender flows. */
export default function CodexPaymentButton({ children, color = 'codex', style, ...props }) {
  return (
    <CodexButton
      color={color}
      fullWidth
      touch
      style={{ minHeight: 52, fontSize: '0.95rem', fontWeight: 700, ...style }}
      {...props}
    >
      {children}
    </CodexButton>
  );
}

export { CODEX_TOKENS };
