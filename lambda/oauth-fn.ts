import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getAuthUrl, oauthClient } from "../utils/gapi";
import { google } from "googleapis";
import { GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { AUTH_TOKEN_TABLE, ddbClient } from "../utils/ddb";
import * as chrono from "chrono-node";
import { Mail } from "../types/mail";
import { parseEmails } from "../utils/mails";

export const handler: APIGatewayProxyHandlerV2 = async (e) => {
  const path = e.rawPath;

  switch (path) {
    case "/webhook": {
      const body = e.body;
      if (!body) {
        return { statusCode: 400 };
      }

      const mail = JSON.parse(body) as Mail;

      const tokenResRaw = await ddbClient.send(
        new GetItemCommand({
          Key: { email: { S: mail.FromFull.Email } },
          TableName: AUTH_TOKEN_TABLE,
        }),
      );
      if (!tokenResRaw.Item) {
        return { statusCode: 400 };
      }
      const tokenRes = unmarshall(tokenResRaw.Item);

      oauthClient.setCredentials(tokenRes.tokens);

      const cal = google.calendar({ version: "v3", auth: oauthClient });

      const calendarId = "primary";

      const nextHr = new Date();
      nextHr.setHours(nextHr.getHours() + 1);

      const attendeeEmails = new Set<string>();

      // add the sender as participant
      attendeeEmails.add(mail.FromFull.Email);

      mail.CcFull.forEach((el) => {
        attendeeEmails.add(el.Email);
      });

      mail.ToFull.forEach((el) => {});

      parseEmails(mail.TextBody ?? mail.HtmlBody)?.forEach((email) => {
        attendeeEmails.add(email);
      });

      // we don't invite ourself (or do we)
      attendeeEmails.delete("event@cal.learnaws.io");
      attendeeEmails.delete("events@cal.learnaws.io");

      const attendees = [...attendeeEmails].map((email) => ({ email: email }));

      const timezone = mail.Date.split(" ").at(-1);

      // parse time range from plain english
      const [date] = chrono.parse(mail.TextBody ?? mail.HtmlBody, {
        // instant: new Date(),
        // timezone: "IST",
      });

      const startDateTime = date.start.date();

      let endDateTime = date.end?.date();
      // if there is no end date we set it to 30 mins later
      if (!endDateTime) {
        endDateTime = new Date(startDateTime);
        endDateTime.setMinutes(endDateTime.getMinutes() + 30);
      }

      await cal.events.insert({
        calendarId,
        sendNotifications: true,
        requestBody: {
          summary: mail.Subject,
          start: { dateTime: startDateTime.toISOString() },
          end: { dateTime: endDateTime?.toISOString() },
          attendees,
        },
      });
    }
    case "/":
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "text/html",
        },
        body: `
<h1>Welcome to email to cal</h1>
<a href="/oauth-redirect">Login with Google</a>
`,
      };
    case "/oauth-redirect":
      return {
        statusCode: 302,
        headers: {
          Location: getAuthUrl(),
        },
      };

    case "/oauth-cb":
      const authCode = e?.queryStringParameters?.code;
      if (!authCode) {
        return {
          statusCode: 400,
        };
      }

      const { tokens } = await oauthClient.getToken(authCode);

      oauthClient.setCredentials(tokens);

      const googleAuth = google.oauth2({
        version: "v2",
        auth: oauthClient,
      });

      const userInfo = await googleAuth.userinfo.get();

      if (!userInfo.data.email) {
        throw Error("Email not found in user data");
      }

      const putTokenCmd = new PutItemCommand({
        Item: marshall(
          {
            expiry_date: tokens.expiry_date,
            ...userInfo.data,
            tokens,
          },
          { removeUndefinedValues: true },
        ),
        TableName: AUTH_TOKEN_TABLE,
      });

      await ddbClient.send(putTokenCmd);

      return {
        statusCode: 200,
        body: "<h1>Authentication success.\nYou can close this tab and get back to work!</h1>",
        headers: {
          "Content-Type": "text/html",
        },
      };

    default:
      return {
        statusCode: 404,
      };
  }
};
