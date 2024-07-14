import React, { useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { useStores } from '../store/store-container';

const Query = observer(() => {
  const { global: store } = useStores();
  const codeRef = useRef<HTMLElement>(null);

  const onClick = () => {
    if (codeRef.current) {
      const v = codeRef.current.innerText;
      navigator.clipboard.writeText(v).then(() => {
        store.setCopiedMessage(v);
      });
    }
  };

  return (
    <pre onClick={onClick} style={{ cursor: 'pointer' }}>
      <code
        ref={codeRef}
        style={{ color: 'gray', fontFamily: 'monospace', fontSize: '12px' }}
      >
        {store.loaded ? '' : store.query}
      </code>
    </pre>
  );
});

export default Query;
