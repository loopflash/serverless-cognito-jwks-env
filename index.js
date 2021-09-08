'use strict';
const {CognitoIdentityServiceProvider, Lambda} = require('aws-sdk');
const axios = require('axios').default;

class PluginEnvJwks {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.cognito = new CognitoIdentityServiceProvider({
      region: this.serverless.variables.service.provider.region
    });
    this.lambda = new Lambda({
      region: this.serverless.variables.service.provider.region
    });

    this.hooks = {
      'after:deploy:deploy': this.generateJwks.bind(this),
    };
  }

  async generateJwks() {
    const getAllUserPools = async () => {
      let pools = [];
      let nextToken = null;
      for(;;){
        const { UserPools, NextToken } = await this.cognito.listUserPools(
          {
            ...{
              MaxResults: 60
            },
            ...(nextToken ? ({
              NextToken: nextToken
            }) : ({}))
          }
        ).promise();
        pools = [
          ...pools,
          ...UserPools
        ];
        if(!NextToken) break;
        nextToken = NextToken;
      }
      return pools;
    };
    const region = this.serverless.variables.service.provider.region;
    const decl = this.serverless.variables.service.custom.cognito_jwks_env;
    const action = decl.map((item) => {
      return new Promise(async (resolve) => {
        const { functions, name, env, id } = item;
        let getIdForCognito;
        if(!id){
          const pools = await getAllUserPools();
          getIdForCognito = pools.filter((item) => {
            return item.Name === name;
          })[0].Id;
        }else{
          getIdForCognito = id;
        }
        const url = `https://cognito-idp.${region}.amazonaws.com/${getIdForCognito}/.well-known/jwks.json`;
        const { data } = await axios.get(url);
        const jwks = JSON.stringify(data);
        const mapPromises = functions.map((item) => {
          return new Promise(async (resolve) => {
            const { Configuration } = await this.lambda.getFunction({
              FunctionName: item
            }).promise();
            const variables = Configuration.Environment.Variables;
            let setVariables = {
              ...variables,
              [env || 'COGNITO_JWKS']: Buffer.from(jwks).toString('base64'),
            }
            await this.lambda.updateFunctionConfiguration(
              {
                FunctionName: item,
                Environment: {
                  Variables: setVariables
                },
              }
            ).promise();
            resolve(null);
          });
        });
        await Promise.all(mapPromises);
        resolve(null);
      });
    });
    for(const iter of action){
      await iter;
    }
  }
}

module.exports = PluginEnvJwks;