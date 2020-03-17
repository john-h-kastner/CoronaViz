#! /usr/bin/env python

import json
import csv
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
        epoch_seconds = date.timestamp() / 60;
        time_series_list.append({'time': epoch_seconds, 'cases': cases})

  if time_series_list:
      return { 'name': location,
               'lat': lat,
               'lng': lng,
               'time_series': time_series_list}
  else:
      return None

json_data_dir = './webpage/'
csv_data_dir = './COVID-19/csse_covid_19_data/csse_covid_19_time_series/'
data_file_names = [ 'time_series_19-covid-Confirmed',
                    'time_series_19-covid-Deaths',
                    'time_series_19-covid-Recovered']

for name in data_file_names:
    row_list = []
    with open(csv_data_dir + name + '.csv', 'r') as csv_file:
      reader = csv.DictReader(csv_file)
      for row in reader:
          converted_row = convert_row(row)
          if converted_row:
            row_list.append(converted_row)
    with open(json_data_dir + name + '.json', 'w') as json_file:
      json.dump(row_list, json_file);
