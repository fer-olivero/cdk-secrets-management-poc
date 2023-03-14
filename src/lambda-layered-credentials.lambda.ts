import type { APIGatewayProxyHandlerV2 } from "aws-lambda";

const CREDENTIALS_SECRET_ID = "CredentialsSecret";

export const handler: APIGatewayProxyHandlerV2 = async () => {
  const response = await fetch(`http://localhost:2773/secretsmanager/get?secretId=${CREDENTIALS_SECRET_ID}`, {
    headers: {
      "X-Aws-Parameters-Secrets-Token": process.env['AWS_SESSION_TOKEN']!,
    },
  });
  if (!response.ok) {
    throw new Error("Crendetials fetch error");
  }

  if (response.status !== 200) {
    throw new Error("Credentials fetch not ok")
  }
  const jsonResponse = (await response.json()) as any;

  const credentials = JSON.parse(jsonResponse.SecretString);
  return Promise.resolve({
    body: JSON.stringify(credentials),
  });
};
