import {execute} from './engine.js';
self.onmessage=e=>{try{self.postMessage({id:e.data.id,result:execute(e.data)})}catch(error){self.postMessage({id:e.data.id,error:error.message})}};
