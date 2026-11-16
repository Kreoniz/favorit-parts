import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import './bootstrap.scss';
import './styles.css';
import App from './App';
import { createAppStore, searchRestored } from './store';
import { createSearchUrlSync, readSearchUrl } from './searchUrl';

const urlSync = createSearchUrlSync(window);
const store = createAppStore(readSearchUrl(window.location.href), [urlSync.middleware]);
const stopUrlSync = urlSync.connect(store, searchRestored);
if (import.meta.hot) import.meta.hot.dispose(stopUrlSync);

createRoot(document.getElementById('root')).render(
  <StrictMode><Provider store={store}><App /></Provider></StrictMode>,
);
