import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

export const ddbClient = new DynamoDBClient({});

export const AUTH_TOKEN_TABLE = process.env.AUTH_TOKEN_TABLE as string;

if (!AUTH_TOKEN_TABLE) {
  throw Error("AUTH_TOKEN_TABLE not defined in ENV");
}
