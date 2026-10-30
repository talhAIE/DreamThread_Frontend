export function createAuth(config,storage=globalThis.sessionStorage,fetcher=fetch){
  const key='dreamthread.auth.v1';let session=null,refreshing=null;
  try {session=JSON.parse(storage?.getItem(key)||'null');}catch{/* memory-only */}
  function save(value){session=value;try {if(value)storage?.setItem(key,JSON.stringify(value));else storage?.removeItem(key);}catch{/* memory-only */}}
  async function call(path,body,access){
    if(!config.supabaseUrl || !config.supabasePublishableKey)throw new Error('Supabase Auth is not configured. Check backend/.env and restart the frontend.');
    const response=await fetcher(config.supabaseUrl+'/auth/v1/'+path,{method:'POST',signal:AbortSignal.timeout(20000),headers:{apikey:config.supabasePublishableKey,'Content-Type':'application/json',...(access?{Authorization:`Bearer ${access}`}:{})},body:JSON.stringify(body)});
    const data=await response.json().catch(()=>({}));
    if(!response.ok){const e=new Error(data.msg || data.error_description || data.message || 'Authentication failed.');e.status=response.status;throw e;}return data;
  }
  function accept(data){save({...data,expires_at:data.expires_at || Date.now()/1000+data.expires_in});return data;}
  return {
    clear:()=>save(null),get user(){return session?.user;},
    async token(){
      if(!session?.access_token)return null;
      if(session.expires_at>Date.now()/1000+60)return session.access_token;
      if(!refreshing)refreshing=call('token?grant_type=refresh_token',{refresh_token:session.refresh_token}).then(accept).catch(e=>{if(e.status===400 || e.status===401)save(null);throw e;}).finally(()=>refreshing=null);
      return (await refreshing).access_token;
    },
    signIn:async(email,password)=>accept(await call('token?grant_type=password',{email,password})),
    async signUp(email,password){
      const data=await call('signup',{email,password});
      if(data.access_token)return accept(data);
      try{return accept(await call('token?grant_type=password',{email,password}));}
      catch(error){throw new Error(error.message.toLowerCase().includes('confirm')?'Email confirmation is enabled in Supabase. Disable Confirm email in Authentication → Sign In / Providers → Email to allow immediate email/password login.':error.message);}
    },
    async signOut(){try {if(session)await call('logout',{},session.access_token);}finally {save(null);}},
    async google(){
      if(!config.supabaseUrl)throw new Error('Supabase Auth is not configured.');
      const verifier=Array.from(crypto.getRandomValues(new Uint8Array(48)),b=>b.toString(16).padStart(2,'0')).join('');storage.setItem('dreamthread.pkce',verifier);
      const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
      const challenge=btoa(String.fromCharCode(...new Uint8Array(hash))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
      location.assign(config.supabaseUrl+'/auth/v1/authorize?'+new URLSearchParams({provider:'google',redirect_to:location.origin+'/',code_challenge:challenge,code_challenge_method:'s256'}));
    },
    async callback(){
      const params=new URLSearchParams(location.search),fragment=new URLSearchParams(location.hash.slice(1));
      if(params.has('error_description') || fragment.has('error_description')){const message=params.get('error_description') || fragment.get('error_description');history.replaceState(null,'',location.pathname+'#/welcome');throw new Error(message);}
      const code=params.get('code');if(!code)return;
      const verifier=storage.getItem('dreamthread.pkce');history.replaceState(null,'',location.pathname+'#/welcome');
      if(!verifier)throw new Error('Sign-in session expired. Start Google sign-in again.');
      accept(await call('token?grant_type=pkce',{auth_code:code,code_verifier:verifier}));storage.removeItem('dreamthread.pkce');
    },
  };
}
