import { LambdaIntegration, MethodLoggingLevel, RestApi } from "aws-cdk-lib/aws-apigateway"
import { AnyPrincipal, Effect, PolicyStatement } from "aws-cdk-lib/aws-iam"
import { Function, Runtime, AssetCode, Code } from "aws-cdk-lib/aws-lambda"
import s3 = require("aws-cdk-lib/aws-s3")

import { Duration, Stack, StackProps } from "aws-cdk-lib"
import cloudfront = require('aws-cdk-lib/aws-cloudfront')

import iam = require('aws-cdk-lib/aws-iam')

import { CloudFrontToApiGateway } from '@aws-solutions-constructs/aws-cloudfront-apigateway';

import acm = require('aws-cdk-lib/aws-certificatemanager')

import { Construct } from 'constructs';

require('dotenv').config()

interface LambdaApiStackProps extends StackProps {
  functionName: string
}

export class NotionSitesOnAwsStack extends Stack {
  private restApi: RestApi
  private lambdaFunction: Function
  private bucket: s3.Bucket

  constructor(scope: Construct, id: string, props: LambdaApiStackProps) {
    super(scope, id, props)

    this.bucket = new s3.Bucket(this, "notion-sites-on-aws")

    this.restApi = new RestApi(this, this.stackName + "RestApi", {
      deployOptions: {
        stageName: "prod",
        metricsEnabled: true,
        loggingLevel: MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
      },
      binaryMediaTypes: ['image/*', 'video/*']
    })
    const lambdaPolicy = new PolicyStatement()
    lambdaPolicy.addActions("s3:ListBucket")
    lambdaPolicy.addResources(this.bucket.bucketArn)

    this.lambdaFunction = new Function(this, props.functionName, {
      functionName: props.functionName,
      handler: "handler.handler",
      runtime: Runtime.NODEJS_14_X,
      code: new AssetCode(`./src`),
      memorySize: 256,
      timeout: Duration.seconds(10),
      environment: {
        BUCKET: this.bucket.bucketName,
        DOMAIN_NAME: (process.env.DOMAIN_NAME || '')
      },
      initialPolicy: [lambdaPolicy]
    })
    const pathname = this.restApi.root.addResource('{pathname}');

    this.restApi.root.addMethod("ANY", new LambdaIntegration(this.lambdaFunction))

    pathname.addMethod("ANY", new LambdaIntegration(this.lambdaFunction, { proxy: true }))

    const certificate = acm.Certificate.fromCertificateArn(this, 'Certificate', (process.env.AWS_SSL_CERTIFICATE_ARN || ''));


    new CloudFrontToApiGateway(this, 'notion-site-distribution', {
      existingApiGatewayObj: this.restApi,
      cloudFrontDistributionProps: {
        certificate: certificate,
        domainNames: [process.env.DOMAIN_NAME],
        defaultBehavior: {
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        forwardedValues: {
          queryString: true,
          cookies: {
            forward: "forward",
          },
          headers: ['Accept', 'Referer', 'Authorization', 'Content-Type', 'Origin', 'Access - Control-Request-Method', 'Sec-Fetch-Site', 'Access-Control-Request-Headers', 'Sec - Fetch-Dest', 'Sec-Fetch-Mode'],
        }
      },
    });
  }
}
