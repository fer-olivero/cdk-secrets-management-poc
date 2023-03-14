#!/usr/bin/env -S pnpm tsx
import assert from 'node:assert/strict';
import * as cdk from 'aws-cdk-lib';
import { CfnOutput, Duration, RemovalPolicy, SecretValue, Stack, StackProps } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { IKey, Key } from 'aws-cdk-lib/aws-kms';
import { FunctionUrlAuthType, LambdaInsightsVersion, LayerVersion, Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { Charset, NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import type { Construct } from 'constructs';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';

class CdkSecretsManagementPOCStack extends Stack {
    secretKmsKey: IKey
    secret: Secret
    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);
        this.secretKmsKey = new Key(this, "kmsEncryptKey", {
            description: "KMS Key for decrypt credentials",
            alias: `SecretCredentials`,
            removalPolicy: RemovalPolicy.DESTROY,
        });

        this.secret = new Secret(this, "CredentialsSecret", {
            encryptionKey: this.secretKmsKey,
            secretName: "CredentialsSecret",
            secretStringValue: SecretValue.unsafePlainText(
                JSON.stringify({
                    name: "Lionel",
                    lastName: "Messi"
                })
            ),
        });

        this.layeredCredentialsLambda();
        this.sdkCredentialsLambda();
        this.environmentCredentialsLambda();
    }

    private layeredCredentialsLambda() {
        const layeredCredentialsLambda = new NodejsFunction(this, "layeredCredentialsLambda", {
            entry: "src/lambda-layered-credentials.lambda.ts",
            runtime: Runtime.NODEJS_18_X,
            handler: "handler",
            logRetention: RetentionDays.ONE_DAY,
            memorySize: 1024,
            timeout: Duration.seconds(10),
            insightsVersion: LambdaInsightsVersion.VERSION_1_0_143_0,
            tracing: Tracing.ACTIVE,
            bundling: {
                minify: true,
                charset: Charset.UTF8,
                // required for top-level await
                format: OutputFormat.ESM,
            },
        });

        const fnUrl = layeredCredentialsLambda.addFunctionUrl({ authType: FunctionUrlAuthType.NONE });

        this.secretKmsKey.grantDecrypt(layeredCredentialsLambda);

        assert.equal(Stack.of(this).region, "us-west-2");
        layeredCredentialsLambda.addLayers(
            LayerVersion.fromLayerVersionArn(
                this,
                "AWS-SecretsLambdaExtension",
                "arn:aws:lambda:us-west-2:345057560386:layer:AWS-Parameters-and-Secrets-Lambda-Extension:4"
            )
        );

        this.secret.grantRead(layeredCredentialsLambda);

        new CfnOutput(this, "layeredCredentialsLambdaUrl", { value: fnUrl.url })
    }

    private environmentCredentialsLambda() {
        const environmentCredentialsLambda = new NodejsFunction(this, "environmentCredentialsLambda", {
            entry: "src/environment-credentials.lambda.ts",
            runtime: Runtime.NODEJS_18_X,
            handler: "handler",
            logRetention: RetentionDays.ONE_DAY,
            memorySize: 1024,
            insightsVersion: LambdaInsightsVersion.VERSION_1_0_143_0,
            tracing: Tracing.ACTIVE,
            timeout: Duration.seconds(10),
            bundling: {
                minify: true,
                charset: Charset.UTF8,
                // required for top-level await
                format: OutputFormat.ESM,
            },
        });

        const fnUrl = environmentCredentialsLambda.addFunctionUrl({ authType: FunctionUrlAuthType.NONE });

        this.secretKmsKey.grantDecrypt(environmentCredentialsLambda);

        environmentCredentialsLambda.addEnvironment(
            "ENCRYPTED_STRING",
            "AQICAHheyuU6QmfNTAWj5zO+J2eWepmpRLUkXen/kR2pl+f1nQG1fMPTFJlog5t00XHRweBsAAAAhDCBgQYJKoZIhvcNAQcGoHQwcgIBADBtBgkqhkiG9w0BBwEwHgYJYIZIAWUDBAEuMBEEDNP+7DkKezGI793xfQIBEIBAseR7hC9+Gz3cWozU+X/EREq4DsloMiW8YYqkWOoLEIwBPUdPtZVqgSadDy9Qz1fBJu7pFnpa7uJq2ylkb9ZPrw=="
        );

        environmentCredentialsLambda.addEnvironment("KMS_KEY_ARN", this.secretKmsKey.keyArn);

        new CfnOutput(this, "environmentCredentialsLambdaUrl", { value: fnUrl.url })
    }

    private sdkCredentialsLambda() {
        const sdkCredentialsLambda = new NodejsFunction(this, "SDKCredentialsLambda", {
            entry: "src/secret-manager-sdk-credentials.lambda.ts",
            runtime: Runtime.NODEJS_18_X,
            handler: "handler",
            logRetention: RetentionDays.ONE_DAY,
            memorySize: 1024,
            insightsVersion: LambdaInsightsVersion.VERSION_1_0_143_0,
            tracing: Tracing.ACTIVE,
            timeout: Duration.seconds(10),
            bundling: {
                minify: true,
                charset: Charset.UTF8,
                // required for top-level await
                format: OutputFormat.ESM,
            },
        });

        const fnUrl = sdkCredentialsLambda.addFunctionUrl({ authType: FunctionUrlAuthType.NONE });

        sdkCredentialsLambda.addToRolePolicy(
            new PolicyStatement({
                sid: "KMSSenderKey",
                actions: ["kms:Decrypt"],
                resources: [this.secretKmsKey.keyArn],
            })
        );

        sdkCredentialsLambda.addEnvironment("KMS_KEY_ARN", this.secretKmsKey.keyArn);

        this.secret.grantRead(sdkCredentialsLambda);

        new CfnOutput(this, "sdkCredentialsLambdaUrl", { value: fnUrl.url })
    }
}



const app = new cdk.App();
new CdkSecretsManagementPOCStack(app, "CdkSecretsManagementPOCStack", {
    env: {
        account: process.env["CDK_DEFAULT_ACCOUNT"],
        region: process.env["CDK_DEFAULT_REGION"],
    },
});