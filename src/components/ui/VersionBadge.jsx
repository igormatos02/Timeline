const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

export default function VersionBadge({ style }) {
  return (
    <span
      className="version-badge"
      title="Versão do sistema"
      style={{ ...style }}
    >
      v{appVersion}
    </span>
  );
}