// Dependency-free static build. Publish only explicitly allowlisted public settings.
import {cp, mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const supabaseUrl=(process.env.SUPABASE_URL || '').trim().replace(/\/$/,'');
const key=(process.env.SUPABASE_PUBLISHABLE_KEY || '').trim();
if(!supabaseUrl || !key)throw new Error('Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in Vercel Environment Variables, then redeploy.');
const url=new URL(supabaseUrl);
if(url.protocol!=='https:' || url.username || url.password || url.pathname!=='/' || url.search || url.hash)
  throw new Error('SUPABASE_URL must be your HTTPS project origin without a path.');
let role;
try{role=JSON.parse(Buffer.from(key.split('.')[1] || '', 'base64url').toString()).role;}catch{/* New publishable keys are opaque. */}
if(key.startsWith('sb_secret_') || role==='service_role')throw new Error('Use the Supabase publishable/anon key, never a secret/service-role key.');
const config={apiBase:'/api/v1',supabaseUrl,supabasePublishableKey:key,voiceEnabled:process.env.VOICE_ENABLED==='true'};
const output=resolve(root,'dist');
await mkdir(output,{recursive:true});
await cp(resolve(root,'frontend'),output,{recursive:true});
await writeFile(resolve(output,'config.json'),JSON.stringify(config,null,2)+'\n');
console.log('DreamThread static frontend built in dist/. API requests route to the Render backend.');
