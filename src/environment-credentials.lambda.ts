import assert from "node:assert/strict";
import { TextDecoder } from "node:util";

import { DecryptCommand, KMSClient } from "@aws-sdk/client-kms";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";

const kmsClient = new KMSClient({});
const encryptedValue = process.env["ENCRYPTED_STRING"]
assert(encryptedValue, "Encrypted Credentials not found");
assert(process.env["KMS_KEY_ARN"], "KMS Key ARN not found.");

const credentialsResponse = await kmsClient.send(
  new DecryptCommand({
    CiphertextBlob: Buffer.from(encryptedValue, "base64"),
    KeyId: process.env["KMS_KEY_ARN"],
  })
);

const credentials = JSON.parse(new TextDecoder().decode(credentialsResponse.Plaintext));

export const handler: APIGatewayProxyHandlerV2 = () => {
  return Promise.resolve({
    body: JSON.stringify(credentials),
  });
};
