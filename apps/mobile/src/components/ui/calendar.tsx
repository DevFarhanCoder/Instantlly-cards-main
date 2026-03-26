import React from "react";
import { Calendar as RNCalendar, CalendarProps } from "react-native-calendars";

export const Calendar = (props: CalendarProps) => {
  return <RNCalendar {...props} />;
};

