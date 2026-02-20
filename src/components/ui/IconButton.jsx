export default function IconButton({ children = "+", className = "", ...props }) {
  return (
    <button className={`icon-button ${className}`.trim()} type="button" {...props}>
      {children}
    </button>
  );
}
