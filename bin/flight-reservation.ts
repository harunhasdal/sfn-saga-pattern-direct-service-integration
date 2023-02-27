#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { FlightReservationSagaStack } from "../lib/flight-reservation-saga";

const app = new cdk.App();
new FlightReservationSagaStack(app, "FlightReservationSagaStack", {});
