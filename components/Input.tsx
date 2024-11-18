import TextField from '@mui/material/TextField';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef } from 'react';
import { useStores } from '../store/store-container';
import { prettifyExpression } from '../store/util';

interface InputProps {
  sessionId: string;
}

const Input: React.FC<InputProps> = observer(({ sessionId }) => {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const { global } = useStores();
  const session = global.getSession(sessionId);

  const setExpression = (expression: string) => {
    session.expression = expression;
  };

  /**
   * Only prettify if `|` is added at the end of the expression
   */
  const shouldPrettify = () => {
    const cursorPosition = inputRef.current ? inputRef.current.selectionStart : 0;
    return cursorPosition === session.expression.length;
  };

  const isPrintableChar = (key: string) => {
    return key.length === 1;
  };
  const isModifierKeyCombo = (e: React.KeyboardEvent) => {
    return e.ctrlKey || e.metaKey;
  };

  /**
   * Handles all keyboard interactions in the input component.
   * The behavior changes based on the current mode (result, input, or graph)
   *
   * Result mode:
   * - Any key press switches back to input mode
   *
   * Input mode:
   * - `Tab`: Switches to graph mode and selects first candidate
   * - `|`: Prettifies the expression if cursor is at the end
   * - `Enter`: Evaluates the current expression
   * - Any other key: Marks results as not loaded
   *
   * Graph mode:
   * - `Escape`: Returns to input mode
   * - `Enter` / `|`: Selects current candidate and returns to input mode
   * - `Tab`: Cycles through candidates (`Shift+Tab` for reverse)
   * - `Arrow Up`/`Down`: Navigate between candidates
   * - Printable chars: Append to expression and switch to input mode
   *
   * Global behaviors:
   * - Blocks all actions if not connected
   * - Allows modifier key combinations (`Ctrl` / `Cmd`) to pass through
   */
  const handleKeyPress = async (e: React.KeyboardEvent) => {
    if (!global.connected) {
      session.error = 'Not connected';
      return;
    }

    if (isModifierKeyCombo(e)) {
      return;
    }

    switch (session.mode) {
      case 'result':
        session.loaded = false;
        session.mode = 'input';
        return;

      case 'input':
        switch (e.key) {
          case 'Tab':
            e.preventDefault();
            session.mode = 'graph';
            session.selectNextCandidate(1);
            return;
          case '|':
            if (!shouldPrettify()) return;
            e.preventDefault();
            setExpression(prettifyExpression(session.expression));
            return;
          case 'Enter':
            e.preventDefault();
            session.evaluate();
            return;
          default:
            session.loaded = false;
            return;
        }

      case 'graph':
        switch (e.key) {
          case 'Escape':
            e.preventDefault();
            session.mode = 'input';
            return;
          case 'Enter':
          case '|':
            e.preventDefault();
            session.mode = 'input';
            setExpression(session.getExpressionUsingCandidate());
            return;
          case 'Tab':
            e.preventDefault();
            session.selectNextCandidate(e.shiftKey ? -1 : 1);
            return;
          case 'ArrowUp':
            e.preventDefault();
            session.selectNextCandidate(-1);
            return;
          case 'ArrowDown':
            e.preventDefault();
            session.selectNextCandidate(1);
            return;
          default:
            if (!isPrintableChar(e.key)) {
              return;
            }
            e.preventDefault();
            session.mode = 'input';
            session.loaded = false;
            setExpression(session.expression + e.key);
            return;
        }
    }
  };

  return (
    <TextField
      id="input"
      label="Pine expression... "
      value={session.expression}
      size="small"
      variant="outlined"
      focused={session.mode === 'input'}
      onFocus={() => {
        session.mode = 'input';
      }}
      multiline
      fullWidth
      minRows="8"
      maxRows="15"
      inputRef={inputRef}
      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setExpression(e.target.value)}
      onKeyDown={handleKeyPress}
      disabled={!global.connected}
    />
  );
});

export default Input;
