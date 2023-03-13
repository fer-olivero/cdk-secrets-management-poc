import assert from "assert";

import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";

const smClient = new SecretsManagerClient({});
const secret = await smClient.send(new GetSecretValueCommand({ SecretId: "CredentialsSecret" }));
assert(secret.SecretString, "CredentialsSecret not found");
const credentials = JSON.parse(secret.SecretString) as any;

export const handler: APIGatewayProxyHandlerV2 = () => {
  return Promise.resolve({
    body: JSON.stringify(credentials),
  });
};
