import { Template, Match } from "aws-cdk-lib/assertions";
import * as cdk from "aws-cdk-lib";
import ReservationStack = require("../lib/flight-reservation-saga");

let template: Template;

beforeAll(() => {
  const app = new cdk.App();
  const stack = new ReservationStack.FlightReservationSagaStack(
    app,
    "MyTestStack"
  );
  template = Template.fromStack(stack);
});

test("DynamoDB Table Created", () => {
  template.resourceCountIs("AWS::DynamoDB::Table", 1);
});
