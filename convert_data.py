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

def convert_row_us(row_dict):
  # drop last 4 character because these are always ', US'
  location = row_dict["Combined_Key"][:-4]

  lat = row_dict["Lat"]
  lng = row_dict["Long_"]

  # The us CSV has some entries  with 0,0 coordinates.
  # Ignore these
  if float(lat) == 0 and float(lng) == 0:
    return None

  row_dict.pop("Combined_Key", None)
  row_dict.pop("Province_State", None)
  row_dict.pop("Country_Region", None)
  row_dict.pop("Lat", None)
  row_dict.pop("Long_", None)
  row_dict.pop("UID", None)
  row_dict.pop("iso2", None)
  row_dict.pop("iso3", None)
  row_dict.pop("FIPS", None)
  row_dict.pop("Admin2", None)
  row_dict.pop("code3", None)
  row_dict.pop("Population", None)

  time_series_list = []
  for date_str, cases_str in row_dict.items():
      cases = int(cases_str)
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

def read_time_series(name):
    jhu_data_dir = "COVID-19/csse_covid_19_data/csse_covid_19_time_series"
    world_csv_file = jhu_data_dir + "/time_series_covid19_" + name + "_global.csv"
    us_csv_file = jhu_data_dir + "/time_series_covid19_" + name + "_US.csv"

    row_list = []
    with open(world_csv_file, 'r') as csv_file:
      reader = csv.DictReader(csv_file)
      for row in reader:
          if(row['Country/Region'] != 'US'):
              converted_row = convert_row(row)
              if converted_row:
                row_list.append(converted_row)
    try:
        with open(us_csv_file, 'r') as csv_file:
          reader = csv.DictReader(csv_file)
          for row in reader:
              converted_row = convert_row_us(row)
              if converted_row:
                row_list.append(converted_row)
    except FileNotFoundError:
        print('US DATA FILE NOT FOUND')
    return row_list

data_series = ["confirmed", "recovered", "deaths"]
confirmed = read_time_series("confirmed")
recovered = read_time_series("recovered")
deaths = read_time_series("deaths")

row_list = []
for i in range(0,len(confirmed)):
    confirmed_entry = confirmed[i]
    deaths_entry = next((e for e in deaths if e['name'] == confirmed_entry['name']))
    recovered_entry = next((e for e in recovered if e['name'] == confirmed_entry['name']), None)

    time_series = []
    if recovered_entry:
        for (c,d,r) in zip(confirmed_entry['time_series'], deaths_entry['time_series'], recovered_entry['time_series']):
            time_series_entry = [c['time'], c['cases'], d['cases'], r['cases']]
            time_series.append(time_series_entry)
    else:
        for (c,d) in zip(confirmed_entry['time_series'], deaths_entry['time_series']):
            time_series_entry = [c['time'], c['cases'], d['cases'], 0]
            time_series.append(time_series_entry)
        
    row_list.append({
        'name': confirmed_entry['name'],
        'lat': confirmed_entry['lat'],
        'lng': confirmed_entry['lng'],
        'time_series': time_series
    })


with open('webpage/jhu_data.js', 'w') as json_file:
  json_file.write('jhuData = ')
  json.dump(row_list, json_file)
