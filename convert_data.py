#! /usr/bin/env python

import sys
import json
import csv
import argparse
from dateutil.parser import parse

def convert_row(row_dict):
  location = row_dict["Province/State"]
  if location == "":
      location = row_dict["Country/Region"]

  lat = row_dict["Lat"]
  lng = row_dict["Long"]

  row_dict.pop("Province/State", None)
  row_dict.pop("Country/Region", None)
  row_dict.pop("Lat", None)
  row_dict.pop("Long", None)

  time_series_list = []
  for date_str, cases_str in row_dict.items():
      cases = int(cases_str)
      if cases > 0:
        date = parse(date_str)
        epoch_mins = date.timestamp() / 60;
        time_series_list.append({'time': epoch_mins, 'cases': cases})

  if time_series_list:
      return { 'name': location,
               'lat': lat,
               'lng': lng,
               'time_series': time_series_list}
  else:
      return None

parser = argparse.ArgumentParser()
parser.add_argument('CSV_FILE', help='Input CSV file')
parser.add_argument('JS_FILE', help='Output JS file for JSON data')
parser.add_argument('JS_VAR', help='Variable name in JS file')
args = parser.parse_args()

row_list = []
with open(args.CSV_FILE, 'r') as csv_file:
  reader = csv.DictReader(csv_file)
  for row in reader:
      converted_row = convert_row(row)
      if converted_row:
        row_list.append(converted_row)
with open(args.JS_FILE, 'w') as json_file:
  json_file.write(args.JS_VAR + ' = ')
  json.dump(row_list, json_file);
