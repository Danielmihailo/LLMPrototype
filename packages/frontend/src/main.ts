import { JarvisShell } from "./ui/shell/JarvisShell.js";
import { ChatPanel } from "./ui/chat/ChatPanel.js";
import { ConnectShopWizard } from "./ui/onboarding/ConnectShopWizard.js";
import { VoiceCapture, VoiceVisualizer, speak } from "./ui/voice/VoiceCapture.js";
import { navigate, onRoute, getRoute } from "./app/state.js";
import { api } from "./api/client.js";
import { patchState } from "./app/state.js";

const app = document.getElementById("app")!;
const shell = new JarvisShell(app);
const main = shell.getMain();
const nav = shell.getNav();

const chat = new ChatPanel(main, (p) => shell.setPulse(p));
const wizard = new ConnectShopWizard(main);
const voiceViz = new VoiceVisualizer(main);
const voice = new VoiceCapture(
  (text) => {
    voiceViz.setListening(false);
    void chat.send(text);
    speak("Verstanden.");
  },
  (active) => voiceViz.setListening(active),
);

voiceViz.getButton().addEventListener("click", () => voice.start());

function renderLogin(): void {
  main.innerHTML = `
    <div class="login">
      <h2>JARVIS Login</h2>
      <input id="email" type="email" placeholder="E-Mail" />
      <input id="password" type="password" placeholder="Passwort" />
      <button id="login-btn">Anmelden</button>
      <button id="register-btn">Registrieren</button>
    </div>`;
  main.querySelector("#login-btn")?.addEventListener("click", () => void doAuth("login"));
  main.querySelector("#register-btn")?.addEventListener("click", () => void doAuth("register"));
}

async function doAuth(mode: "login" | "register"): Promise<void> {
  const email = (main.querySelector("#email") as HTMLInputElement).value;
  const password = (main.querySelector("#password") as HTMLInputElement).value;
  const path = mode === "login" ? "/v1/auth/login" : "/v1/auth/register";
  const res = await api<{ user_id: string }>(path, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  patchState({ userId: res.user_id });
  navigate("chat");
}

function renderNav(): void {
  nav.innerHTML = `
    <button data-route="home">Home</button>
    <button data-route="chat">Chat</button>
    <button data-route="shops">Shops</button>
    <button data-route="login">Login</button>`;
  nav.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.getAttribute("data-route") as "home"));
  });
}

function render(): void {
  const route = getRoute();
  if (route === "login") {
    renderLogin();
    return;
  }
  if (route === "shops") {
    wizard.render();
    return;
  }
  if (route === "chat") {
    // Save voice element before chat.render() wipes the container
    const voiceEl = voiceViz.getButton().parentElement;
    chat.render();
    // Re-attach voice button on top (chat.render() does innerHTML = ... which destroys it)
    if (voiceEl) main.prepend(voiceEl);
    return;
  }
  main.innerHTML = `
    <div class="hero">
      <h1>JARVIS Shop OS</h1>
      <p>Steuere deinen Online-Shop per Sprache — wie Tony Stark mit seinem Anzug.</p>
      <button id="go-chat">Mit JARVIS sprechen</button>
    </div>`;
  main.querySelector("#go-chat")?.addEventListener("click", () => navigate("chat"));
}

renderNav();
onRoute(render);
render();
