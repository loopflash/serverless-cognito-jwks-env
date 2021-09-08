# **Serverless JKWS to ENV**

Smaller plugin for save JKWS of Cognito on a Lambda Environment

### Motivation

This library is thought to save in an environment variable the keys of the CognitoUserPool in **Base64**.

Possible utility:

1. Save requests to external services.
2. When the lambda is in a private VPC with no internet connection.

### Installation

```bash
npm install serverless-cognito-jwks-env --save-dev

```

### Usage

```yaml
plugins:
  - serverless-cognito-jwks-env
```

This method only works after **deploy**

### Configuration

```yaml
custom:
	cognito_jwks_env:
		- id: 'id_cognito' # If id is declared, 'name' will be discarted
		  name: 'cognito_name' # Name of cognito
		  env: 'COGNITO_JKWS' # Env name in Lambda
		  functions:
			- 'name_function1' # Name of the lambda to insert the environment variable
			- 'name_function2'
```