# Secure Legal DMS - Production Backend

This architecture is hardened against common vulnerabilities and uses **AWS Cognito** for authentication and **AWS KMS Envelope Encryption** for robust file security.

## Setup Requirements
Both services now require AWS credentials and infrastructure.

1. Create an AWS Cognito User Pool.
2. Create an AWS KMS Key (Symmetric).
3. Setup a PostgreSQL Database (RDS or local).

### Java Service Setup (Metadata & Auth)
Requires a valid AWS Cognito environment to run properly, as it uses the AWS JWKS keys to validate tokens.

1. Navigate to `java-service/src/main/resources/application.yml`
2. Set your `AWS_REGION` and `COGNITO_USER_POOL_ID`.
3. Set your PostgreSQL credentials.
4. Run: `mvn spring-boot:run`

### Node.js Service Setup (KMS Encrypted Storage)
1. `cd node-service`
2. `npm install`
3. Copy `.env.example` to `.env` and fill in your exact AWS ARN and Cognito details.
4. Ensure your local machine or EC2 instance has valid AWS IAM credentials configured (`~/.aws/credentials`) granting `kms:GenerateDataKey` and `kms:Decrypt`.
5. Run: `node server.js`
