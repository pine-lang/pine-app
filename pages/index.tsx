import { ClerkProvider } from '@clerk/nextjs';
import { Box, Grid, Typography } from '@mui/material';
import Container from '@mui/material/Container';
import type { NextPage } from 'next';
import { useEffect } from 'react';
import ActiveConnection from '../components/ActiveConnection';
import GraphBox from '../components/Graph.box';
import Input from '../components/Input';
import Message from '../components/Message';
import Query from '../components/Query';
import Result from '../components/Result';
import UserBox from '../components/UserBox';
import { useStores } from '../store/store-container';
import Session from '../components/Session';
import PineTabs from '../components/PineTabs';

const Home: NextPage = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  const { global } = useStores();

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      global.setMode('input');
    };
    document.addEventListener('keydown', fn);
    return () => {
      document.removeEventListener('keydown', fn);
    };
  }, [global]);

  const UserContent = isDevelopment ? (
    <Typography variant="caption" color="gray">
      Dev Mode
    </Typography>
  ) : (
    <UserBox />
  );

  const AppContent = (
    <Container
      maxWidth={false}
      disableGutters={true}
      sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}
    >
      <Grid container>
        <Grid item xs={3}>
          <Box sx={{ m: 2, mt: 1 }}>
            <ActiveConnection />
          </Box>
        </Grid>

        <Grid item xs={8}>
          <Box sx={{ m: 1 }}>
            <Message />
          </Box>
        </Grid>

        <Grid item xs={1}>
          {UserContent}
        </Grid>
      </Grid>

      <Box sx={{ m: 1, display: 'flex', flexDirection: 'column' }}>
        <PineTabs></PineTabs>
      </Box>
    </Container>
  );

  return isDevelopment ? AppContent : <ClerkProvider>{AppContent}</ClerkProvider>;
};

export default Home;
