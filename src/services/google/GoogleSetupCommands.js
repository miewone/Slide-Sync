/** Generate copyable Bash/Cloud Shell commands; no command is executed by the app. */
export class GoogleSetupCommands {
  /** @param {string} origin Site origin used for the Picker key's referrer restriction. */
  static create(origin){
    const url=new URL(origin);
    if(!['https:','http:'].includes(url.protocol)||url.origin!==origin)throw new Error('Expected an HTTP(S) origin');
    const quoted="'"+(origin+'/*,https://docs.google.com/*').replaceAll("'","'\\''")+"'";
    return String.raw`# Bash / Google Cloud Shell
# Replace with your existing Google Cloud project ID (not project number).
SLIDE_SYNC_PROJECT_ID='your-project-id'
SLIDE_SYNC_KEY_ID='slide-sync-browser'

# Skip login if Cloud Shell is already signed in to the correct account.
gcloud auth login

gcloud services enable \
  serviceusage.googleapis.com \
  apikeys.googleapis.com \
  drive.googleapis.com \
  slides.googleapis.com \
  picker.googleapis.com \
  --project="$SLIDE_SYNC_PROJECT_ID"

# Create a dedicated, restricted Picker key.
gcloud services api-keys create \
  --project="$SLIDE_SYNC_PROJECT_ID" \
  --key-id="$SLIDE_SYNC_KEY_ID" \
  --display-name='Slide Sync browser' \
  --api-target=service=picker.googleapis.com \
  --allowed-referrers=${quoted}

# Copy this output into the app's API Key field.
gcloud services api-keys get-key-string "$SLIDE_SYNC_KEY_ID" \
  --project="$SLIDE_SYNC_PROJECT_ID" \
  --location=global \
  --format='value(keyString)'

# Copy this output into the app's Project number field.
gcloud projects describe "$SLIDE_SYNC_PROJECT_ID" \
  --format='value(projectNumber)'`;
  }
}
