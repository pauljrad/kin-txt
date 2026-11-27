import {createRoot} from 'react-dom/client';
import {KineticPlayer} from './components/KineticPlayer';
import {parseTextContent,processTextStyles} from './lib/textParser';
import './index.css';
import guide from '../content/guides/how-to-concentrate-on-reading.json';
const passage=guide.sections.flatMap(s=>s.paragraphs).find(p=>p.startsWith('A paced reading interface'))!;
const article=processTextStyles(parseTextContent(passage));
const host=document.getElementById('reader') || document.getElementById('root')!;
host.classList.add('dark');
const root=createRoot(host);
let key=0;
function mount(){root.render(<KineticPlayer key={++key} parsedText={article.cleanedText} initialView="word" motionDemo onBack={()=>{}} emphasisWords={article.detectedEmphasis} whisperedWords={article.detectedWhispered}/>);}
window.addEventListener('kin-motion-reset',mount);
mount();