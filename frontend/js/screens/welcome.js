import { brand } from '../components/ui.js';
export function welcome() {
  return `<div class="app-frame"><main class="welcome">${brand()}
    <section class="welcome-story" aria-labelledby="welcome-title"><div class="welcome-graph" aria-hidden="true"><img src="assets/figma/812e5.svg" alt=""><div class="motif-image forest" data-art="forest"></div><div class="motif-image ocean" data-art="ocean"></div><div class="motif-image stranger" data-art="stranger"></div><div class="motif-image door" data-art="door"></div></div>
      <h1 id="welcome-title" tabindex="-1">The living memory of<br>your dreams.</h1><p class="welcome-lead">Capture your dreams. Discover the threads between them.</p></section>
    <form class="auth panel" id="sign-in" aria-labelledby="auth-title"><h2 id="auth-title">Your journal begins here</h2>
      <label for="email">Email</label><input id="email" name="email" type="email" placeholder="sarah@dreamthread.app" autocomplete="off" required aria-describedby="auth-error">
      <label for="password" class="password-label">Password</label><input id="password" name="password" type="password" placeholder="••••••••••" autocomplete="off" required minlength="4" aria-describedby="auth-error">
      <button class="button primary full continue" type="submit">Continue</button><button class="button full google" type="button" data-action="google">Continue with Google</button>
      <p class="auth-foot">New here? <button type="button" data-action="create-account">Create an account</button></p><p class="auth-foot privacy">Your entries are private to your account.</p><p id="auth-error" class="auth-error" role="status"></p>
    </form></main></div>`;
}
