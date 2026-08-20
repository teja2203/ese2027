import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { useSnapshot } from '../../lib/state'

function ThemedToaster(props: ToasterProps) {
  const theme = useSnapshot((s) => s.theme)
  const light = theme === 'paper'
  return (
    <Sonner
      theme={light ? 'light' : 'dark'}
      position="bottom-center"
      duration={2200}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            '!rounded-[var(--r)] !border !border-[var(--line)] !bg-[var(--bg-2)] !font-ui !text-[var(--ink)] !shadow-xl',
          description: '!text-[var(--ink-3)]'
        }
      }}
      style={
        {
          '--normal-bg': 'var(--bg-2)',
          '--normal-border': 'var(--line)',
          '--normal-text': 'var(--ink)',
          '--normal-shadow': '0 12px 32px rgba(0,0,0,.45)',
          '--success-bg': 'var(--bg-2)',
          '--success-text': 'var(--ink)',
          '--error-bg': 'var(--bg-2)',
          '--error-text': 'var(--acc)',
          '--error-border': 'var(--acc)'
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { ThemedToaster }