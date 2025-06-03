import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import { AttributeType, TableV2 } from "aws-cdk-lib/aws-dynamodb";
import {
  FunctionUrl,
  FunctionUrlAuthType,
  RuntimeManagementMode,
} from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

export class EmailToCalendarStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const googleAuthTokenTable = new TableV2(this, "gcal-auth-token", {
      partitionKey: {
        name: "email",
        type: AttributeType.STRING,
      },
      timeToLiveAttribute: "expiry_date",
    });

    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw Error("GOOGLE_CLIENT_SECRET or GOOGLE_CLIENT_ID is not in ENV");
    }

    const oauthRedirectFn = new NodejsFunction(this, "oauth-redirect-fn", {
      entry: "./lambda/oauth-fn.ts",
      memorySize: 512,
      runtimeManagementMode: RuntimeManagementMode.FUNCTION_UPDATE,
      bundling: {
        format: OutputFormat.CJS,
      },
      environment: {
        AUTH_TOKEN_TABLE: googleAuthTokenTable.tableName,
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
      },
    });

    googleAuthTokenTable.grantReadWriteData(oauthRedirectFn);

    const url = new FunctionUrl(this, "oauth-fn-url", {
      function: oauthRedirectFn,
      authType: FunctionUrlAuthType.NONE,
    });

    new CfnOutput(this, "fn-url", { value: url.url });
  }
}
