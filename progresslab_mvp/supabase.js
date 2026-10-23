
const SUPABASE_URL = "https://fkjedmtiqxpirixxorat.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Za3HS4a7Rh1QLjmBZ9yp5Q_MzxHNHrH";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

window.progressLabSupabase = supabaseClient;
console.log("ProgressLab Supabase:", window.progressLabSupabase ? "Loaded" : "Not loaded");


const authScreen = document.getElementById("auth-screen");
const authForm = document.getElementById("auth-form");
const authMessage = document.getElementById("auth-message");
const authToggle = document.getElementById("auth-toggle");
const authSubmit = document.getElementById("auth-submit");

let isSignUpMode = false;

function showAuthMessage(message) {
  if (authMessage) authMessage.textContent = message;
}

if (authForm && authToggle && authScreen) {
  authToggle.addEventListener("click", () => {
    isSignUpMode = !isSignUpMode;

    authSubmit.textContent = isSignUpMode ? "Create account" : "Log in";
    authToggle.textContent = isSignUpMode
      ? "Already have an account? Log in"
      : "Need an account? Sign up";

    showAuthMessage("");
  });

  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("auth-email").value.trim();
    const password = document.getElementById("auth-password").value;

    authSubmit.disabled = true;
    showAuthMessage("Please wait...");

    try {
      if (isSignUpMode) {
        const { error } = await supabaseClient.auth.signUp({
          email,
          password
        });

        if (error) throw error;

        showAuthMessage(
          "Account request submitted. Check your email to confirm your account."
        );
      } else {
        const { error } = await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        showAuthMessage("Login successful.");
      }
    } catch (error) {
      showAuthMessage(error.message || "Something went wrong.");
    } finally {
      authSubmit.disabled = false;
    }
  });
}



async function updateAuthScreen() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    showAuthMessage("Could not check your session. Please refresh.");
    return;
  }

  const signedIn = Boolean(data.session);

  if (authScreen) authScreen.hidden = signedIn;

  const appHeader = document.querySelector(".topbar");
  const appMain = document.querySelector("main.container");

  if (appHeader) appHeader.hidden = !signedIn;
  if (appMain) appMain.hidden = !signedIn;
}
updateAuthScreen();
supabaseClient.auth.onAuthStateChange(() => {
  updateAuthScreen();
});



const logoutButton = document.getElementById("logout-btn");

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;

    try {
      const { error } = await supabaseClient.auth.signOut();

      if (error) throw error;
    } catch (error) {
      showAuthMessage(error.message || "Logout failed.");
    } finally {
      logoutButton.disabled = false;
    }
  });
}
console.log("Auth screen:", document.getElementById("auth-screen")?.hidden);
console.log("Main app:", document.querySelector("main.container")?.hidden);
supabaseClient.auth.getSession().then(({ data, error }) => console.log("Session check:", { signedIn: !!data.session, error }));
