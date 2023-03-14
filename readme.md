# Credentials encrypt

## Encrypt with KMS

```bash
aws kms encrypt --key-id alias/SecretCredentials --plaintext fileb://<(echo "{\"name\":\"Lionel\",\"lastName\":\"Messi\"}") --query CiphertextBlob --output text > encrypted.asc 
```

## Decrypt with KMS Key
```bash
aws kms decrypt --ciphertext-blob fileb://<(cat encrypted.asc | base64 -D) --key-id alias/email-rendering-fer --output text --query Plaintext | base64 -D > decrypted.txt
```