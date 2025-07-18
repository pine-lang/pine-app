import { sql } from '@codemirror/lang-sql';
import { EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { Box, Typography } from '@mui/material';
import { EditorView } from 'codemirror';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStores } from '../store/store-container';

interface QueryProps {
  sessionId: string;
}

const Query: React.FC<QueryProps> = observer(({ sessionId }) => {
  const { global: store } = useStores();
  const session = store.getSession(sessionId);
  const editorRef = useRef<HTMLDivElement>(null);

  const onClick = useCallback(() => {
    if (!session.query) {
      return;
    }
    const v = session.query;
    navigator.clipboard.writeText(v).then(() => {
      store.setCopiedMessage(sessionId, v);
    });
  }, [session.query, store, sessionId]);

  useEffect(() => {
    if (!editorRef.current || !session.query) return;

    const extensions = [
      // Use minimal setup instead of basicSetup to avoid unwanted features
      EditorView.lineWrapping,
      sql(),
      EditorView.theme({
        '&': {
          fontSize: '12px',
          fontFamily: 'monospace',
        },
        '.cm-editor': {
          cursor: 'pointer',
        },
        '.cm-focused': {
          outline: 'none',
        },
        '.cm-content': {
          padding: '8px 12px',
        },
        '.cm-editor.cm-focused .cm-selectionBackground': {
          backgroundColor: 'transparent',
        },
        '.cm-activeLine': {
          backgroundColor: 'transparent',
        },
        '.cm-activeLineGutter': {
          backgroundColor: 'transparent',
        },
        '.cm-gutters': {
          display: 'none',
        },
      }),
      EditorView.editable.of(false),
      EditorView.domEventHandlers({
        click: onClick,
      }),
    ];

    if (store.theme === 'dark') {
      extensions.push(oneDark);
    }

    const state = EditorState.create({
      doc: session.query,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    return () => {
      view.destroy();
    };
  }, [session.query, store.theme, onClick]);

  if (session.error && session.errorType === 'parse') {
    return (
      <Box sx={{ margin: 1 }}>
        <Typography
          variant="caption"
          sx={{
            fontFamily: 'monospace',
            whiteSpace: 'break-spaces',
            lineHeight: 1,
            color: 'red',
          }}
        >
          {session.error}
        </Typography>
      </Box>
    );
  }

  if (session.query) {
    return <div ref={editorRef} />;
  }

  return (
    <div
      style={{
        padding: '8px 12px',
        fontSize: '12px',
        fontFamily: 'monospace',
        color: 'gray',
      }}
    >
      SQL shows here for a valid pine expression.
    </div>
  );
});

export default Query;
