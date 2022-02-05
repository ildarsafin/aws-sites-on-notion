#!/usr/bin/env node
import "source-map-support/register"
import cdk = require("aws-cdk-lib")
import { NotionSitesOnAwsStack } from "../lib/notion-sites-on-aws-stack"

export const lambdaApiStackName = "NotionSitesOnAwsStack"
export const lambdaFunctionName = "NotionSitesOnAwsFunction"

const app = new cdk.App()
new NotionSitesOnAwsStack(app, lambdaApiStackName, {
  functionName: lambdaFunctionName,
  env: {
    region: process.env.AWS_REGION,
    account: process.env.AWS_ACCOUNT,
  },
})