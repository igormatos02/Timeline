import React, { useState, useEffect } from 'react';
import packageJson from '../../../package.json';

export default function VersionBadge({ style }) {
  const [version, setVersion] = useState(
    packageJson.version || (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.1.3')
  );

  useEffect(() => {
    fetch('/api/version')
      .then((r) => r.json())
      .then((data) => {
        if (data?.version) {
          setVersion(data.version);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <span
      className="version-badge"
      title="Versão do sistema"
      style={{ ...style }}
    >
      v{version}
    </span>
  );
}