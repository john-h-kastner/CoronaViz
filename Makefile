WEBPAGE_DIR= webpage
BUCKETS = corona coronaviz

JHU_DATA_DIR = COVID-19/csse_covid_19_data/csse_covid_19_time_series
DATA_TYPES = Confirmed Recovered Deaths
DATA_NAMES = $(addprefix time_series_19-covid-,$(DATA_TYPES))
JSON_FILES = $(addprefix $(WEBPAGE_DIR)/,$(addsuffix .json,$(DATA_NAMES)))

$(WEBPAGE_DIR)/%.json: $(JHU_DATA_DIR)/%.csv
	python convert_data.py $^ $@

deploy: $(JSON_FILES) $(WEBPAGE_DIR)/index.html $(WEBPAGE_DIR)/js_buzz.js $(WEBPAGE_DIR)/js_buzz.css
	cd $(WEBPAGE_DIR) ; $(foreach BUCKET, $(BUCKETS), syncobj -r -m . $(BUCKET): ;)
