import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { RemovalPolicy } from "aws-cdk-lib";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

export class FlightReservationSagaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // reservation table
    const table = new dynamodb.Table(this, "ReservationTable", {
      tableName: "flight-reservation-saga-cdk",
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // SNS Topic, SQS Subscription
    const queue = new sqs.Queue(this, "Queue", {
      queueName: "flight-reservation-notifications-cdk",
    });
    const topic = new sns.Topic(this, "Topic", {
      topicName: "flight-reservation-topic-cdk",
    });
    topic.addSubscription(new subscriptions.SqsSubscription(queue));

  }
}
