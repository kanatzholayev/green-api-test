import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { ChatPage } from '../pages/chat';
import styles from './App.module.scss';

const theme = createTheme({
  palette: {
    primary: { main: '#507baa' },
    background: { default: '#f5f6f8' },
    text: { primary: '#202733', secondary: '#78838e' },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: 'none', boxShadow: 'none' } } },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className={styles.app}>
        <ChatPage />
      </div>
    </ThemeProvider>
  </StrictMode>,
);
