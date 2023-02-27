import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { RemovalPolicy } from "aws-cdk-lib";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sqs from "aws-cdk-lib/aws-sqs";

import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import {
  Errors,
  LogLevel,
  StateMachineType,
} from "aws-cdk-lib/aws-stepfunctions";

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

    const notifySuccess = new tasks.SnsPublish(this, "NotifySuccess", {
      topic: topic,
      integrationPattern: sfn.IntegrationPattern.REQUEST_RESPONSE,
      message: sfn.TaskInput.fromText("Reservation succeeded"),
    });
    const succeeded = new sfn.Succeed(this, "Trip Reservation Successful!");

    const createTripRecord = new tasks.DynamoPutItem(
      this,
      "Create Trip Record",
      {
        table: table,
        item: {
          id: tasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt("$$.Execution.StartTime")
          ),
          destination: tasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt("$.destination")
          ),
          balance: tasks.DynamoAttributeValue.numberFromString(
            sfn.JsonPath.stringAt("$.balance")
          ),
          availability: tasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt("$.availability")
          ),
        },
      }
    );

    const reserveFlight = new tasks.DynamoUpdateItem(this, "Reserve Flight", {
      table: table,
      key: {
        id: tasks.DynamoAttributeValue.fromString(
          sfn.JsonPath.stringAt("$$.Execution.StartTime")
        ),
      },
      updateExpression: "SET flightstatus = :valueref",
      expressionAttributeValues: {
        ":valueref": tasks.DynamoAttributeValue.fromString("Reserved"),
      },
    });

    const processPayment = new tasks.DynamoUpdateItem(this, "Process Payment", {
      table: table,

      key: {
        id: tasks.DynamoAttributeValue.fromString(
          sfn.JsonPath.stringAt("$$.Execution.StartTime")
        ),
      },
      updateExpression: "SET paymentstatus = :valueref",
      expressionAttributeValues: {
        ":valueref": tasks.DynamoAttributeValue.fromString("Processed"),
      },
    });

    const confirmFlight = new tasks.DynamoUpdateItem(this, "Confirm Flight", {
      table: table,
      key: {
        id: tasks.DynamoAttributeValue.fromString(
          sfn.JsonPath.stringAt("$$.Execution.StartTime")
        ),
      },
      updateExpression: "SET flightstatus = :valueref",
      expressionAttributeValues: {
        ":valueref": tasks.DynamoAttributeValue.fromString("Confirmed"),
      },
    });

    //Step function definition
    const definition = sfn.Chain.start(createTripRecord)
      .next(reserveFlight)
      .next(processPayment)
      .next(confirmFlight)
      .next(notifySuccess)
      .next(succeeded);
    let saga = new sfn.StateMachine(this, "StateMachine", {
      stateMachineName: "reserve-trip-saga",
      tracingEnabled: true,
      stateMachineType: StateMachineType.EXPRESS,
      definition,
    });
  }
}
