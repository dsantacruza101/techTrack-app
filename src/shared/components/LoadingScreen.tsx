/**
 * Full-screen loading indicator.
 * Single responsibility: display a spinner while auth state resolves.
 */
const LoadingScreen = () => (
  <div className="flex align-items-center justify-content-center min-h-screen tt-bg">
    <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem', color: 'var(--tt-accent)' }} />
  </div>
)

export default LoadingScreen
