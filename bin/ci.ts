#!/usr/bin/env node
import "source-map-support/register"
import cdk = require("aws-cdk-lib")
import { CIStack } from "../lib/ci-stack"

const app = new cdk.App()
new CIStack(app, "NotionSitesOnAwsStack", {
  repositoryName: "notion-sites-on-aws",
})