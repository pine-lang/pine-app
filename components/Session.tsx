import { Box, Grid, IconButton, Tooltip, Typography, Divider, SxProps } from '@mui/material';
import { observer } from 'mobx-react-lite';
import GraphBox from './Graph.box';
import Input from './Input';
import Query from './Query';
import Result from './Result';
import { useStores } from '../store/store-container';
import { Documentation } from './docs/docs';
import { Monitor } from './Monitor';
import { BarChart } from '@mui/icons-material';
import { Session as SessionType } from '../store/session';
import { useState, useEffect } from 'react';
import { getUserPreference, setUserPreference, STORAGE_KEYS } from '../store/preferences';
import { MIN_SIDEBAR_WIDTH, DEFAULT_SIDEBAR_WIDTH } from '../constants';

interface SessionProps {
  sessionId: string;
}

const Sidebar = ({ session, sx }: { session: SessionType; sx: SxProps }) => {
  return (
    <Box sx={sx}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Tooltip
          title={`${session.mode === 'monitor' ? 'Disable' : 'Enable'} connection monitoring`}
        >
          <IconButton
            size="small"
            onClick={() => (session.mode = session.mode === 'monitor' ? 'none' : 'monitor')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <BarChart sx={{ color: session.mode === 'monitor' ? '#4caf50' : '#9e9e9e' }} />
            </Box>
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Input sessionId={session.id} />
      </Box>
      <Box sx={{ border: '1px solid lightgray', borderRadius: 1, mt: 1 }}>
        <Query sessionId={session.id} />
      </Box>
    </Box>
  );
};

const MainView = ({
  sessionId,
  loaded,
  expression,
  mode,
}: {
  sessionId: string;
  loaded: boolean;
  expression: string;
  mode: string;
}) => (
  <Box sx={{ flex: 1 }}>
    {mode === 'monitor' ? (
      <Monitor sessionId={sessionId} />
    ) : !expression ? (
      Documentation
    ) : loaded ? (
      <Result sessionId={sessionId} />
    ) : (
      <Box
        className={mode === 'graph' ? 'focussed' : 'unfocussed'}
        sx={{
          borderRadius: 1,
          height: 'calc(100vh - 122px)',
          overflow: 'hidden',
        }}
      >
        <GraphBox sessionId={sessionId} />
      </Box>
    )}
  </Box>
);

const ResizableDivider = ({
  sidebarWidth,
  setSidebarWidth,
}: {
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
}) => {
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);

    const startX = e.pageX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = startWidth + e.pageX - startX;
      const constrainedWidth = Math.min(
        Math.max(newWidth, MIN_SIDEBAR_WIDTH),
        window.innerWidth * 0.5,
      );
      setSidebarWidth(constrainedWidth);
      setUserPreference(STORAGE_KEYS.SIDEBAR_WIDTH, constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <Divider
      orientation="vertical"
      sx={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        cursor: 'col-resize',
        width: '10px',
        opacity: 0,
        '&:hover': {
          backgroundColor: 'action.hover',
          transition: 'background-color 0.2s',
          opacity: 1,
        },
        ...(isResizing && {
          backgroundColor: 'lightgray',
          width: '14px',
          opacity: 1,
        }),
      }}
      onMouseDown={handleMouseDown}
    />
  );
};

const Session: React.FC<SessionProps> = observer(({ sessionId }) => {
  const { global } = useStores();
  const session = global.getSession(sessionId);

  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);

  useEffect(() => {
    const storedWidth = getUserPreference(STORAGE_KEYS.SIDEBAR_WIDTH, DEFAULT_SIDEBAR_WIDTH);
    setSidebarWidth(storedWidth);
  }, []);

  return (
    <Grid container>
      <Grid
        container
        sx={{
          mt: 2,
          height: 'calc(100vh - 122px)',
        }}
      >
        <Grid item style={{ width: sidebarWidth, position: 'relative' }}>
          <Sidebar session={session} sx={{ mr: '10px' }} />
          <ResizableDivider sidebarWidth={sidebarWidth} setSidebarWidth={setSidebarWidth} />
        </Grid>

        <Grid item style={{ width: `calc(100% - ${sidebarWidth}px)` }}>
          <MainView
            sessionId={sessionId}
            loaded={session.loaded}
            expression={session.expression}
            mode={session.mode}
          />
        </Grid>
      </Grid>
    </Grid>
  );
});

export default Session;
