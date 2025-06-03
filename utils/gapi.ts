import { google } from "googleapis";

const client_id = process.env.GOOGLE_CLIENT_ID;
const client_secret = process.env.GOOGLE_CLIENT_SECRET;

if (!client_id || !client_secret) {
  throw Error("GOOGLE_CLIENT_SECRET or GOOGLE_CLIENT_ID is not in ENV");
}

const redirect_uri =
  "https://lcqmzwyj4pijlbyex7o635w4440vdwck.lambda-url.us-east-1.on.aws/oauth-cb";

export const oauthClient = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uri,
);

const scopes = [
  // "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

export const getAuthUrl = () =>
  oauthClient.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    include_granted_scopes: true,
  });
