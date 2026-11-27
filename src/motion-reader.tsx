import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import GuideReader from './pages/GuideReader';
import './index.css';
createRoot(document.getElementById('root')!).render(<BrowserRouter><GuideReader/></BrowserRouter>);