export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <span
      className="spinner"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label="Завантаження"
    />
  )
}
