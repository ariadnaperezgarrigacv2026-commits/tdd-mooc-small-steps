import "./polyfills";
import express from "express";
import { Database } from "./database";
import {Temporal} from "@js-temporal/polyfill";

// Refactor the following code to get rid of the legacy Date class.
// Use Temporal.PlainDate instead. See /test/date_conversion.spec.mjs for examples.

function createApp(database: Database) {
  const app = express();

  app.put("/prices", (req, res) => {
    const type = req.query.type as string;
    const cost = parseInt(req.query.cost as string);
    database.setBasePrice(type, cost);
    res.json();
  });

  app.get("/prices", (req, res) => {
    const age = req.query.age ? parseInt(req.query.age as string) : undefined;
    const type = req.query.type as string;
    const baseCost = database.findBasePriceByType(type)!.cost;
    const date = parseDate(req.query.date as string);
    const cost = calculateCost(age, type, date, baseCost);
    res.json({ cost });
  });

  function parseDate(dateString: string | undefined): Date | undefined {
    if (dateString) {
      return new Date(dateString);
    }
  }

  function calculateCost(age: number | undefined, type: string, date: Date | undefined, baseCost: number, plainDate: Temporal.PlainDate = convertDate(date)) {
    if (type === "night") {
      return calculateCostForNightTicket(age, baseCost);
    } else {
      return calculateCostForDayTicket(age, date, baseCost, plainDate);
    }
  }

  function calculateCostForNightTicket(age: number | undefined, baseCost: number) {
    if (age === undefined) {
      return 0;
    }
    if (age < 6) {
      return 0;
    }
    if (age > 64) {
      return Math.ceil(baseCost * 0.4);
    }
    return baseCost;
  }

  function calculateCostForDayTicket(age: number | undefined, date: Date | undefined, baseCost: number, plainDate: Temporal.PlainDate = convertDate(date)) {
    let reduction = calculateReduction(date, plainDate);
    if (age === undefined) {
      return Math.ceil(baseCost * (1 - reduction / 100));
    }
    if (age < 6) {
      return 0;
    }
    if (age < 15) {
      return Math.ceil(baseCost * 0.7);
    }
    if (age > 64) {
      return Math.ceil(baseCost * 0.75 * (1 - reduction / 100));
    }
    return Math.ceil(baseCost * (1 - reduction / 100));
  }

  function calculateReduction(date: Date | undefined, plainDate: Temporal.PlainDate = convertDate(date)) {
    let reduction = 0;
    if (plainDate && isMonday(date) && !isHoliday(date)) {
      reduction = 35;
    }
    return reduction;
  }

  function isMonday(date: Date, plainDate: Temporal.PlainDate = convertDate(date)) {
    return plainDate.dayOfWeek === 1;
  }

  function isHoliday(date: Date | undefined, plainDate: Temporal.PlainDate | undefined = convertDate(date) ) {
    const holidays = database.getHolidays();
    for (let row of holidays) {
      let holiday2 = convertDate(new Date(row.holiday));
      if (
        plainDate &&
        plainDate.year === holiday2.year &&
        plainDate.month === holiday2.month &&
        plainDate.day === holiday2.day
      ) {
        return true;
      }
    }
    return false;
  }

  function convertDate(date: Date | undefined):Temporal.PlainDate | undefined { if(date) return Temporal.PlainDate.from(date.toISOString().replace("Z","")); return undefined;}

  return app;
}

export { createApp };
