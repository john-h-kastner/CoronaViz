BUCKETS = corona coronaviz

WEBPAGE_DIR = webpage
WEBPAGE_BASENAMES = index.html js_buzz.js js_buzz.css
WEBPAGE_SRC_FILES = $(addprefix $(WEBPAGE_DIR)/,$(WEBPAGE_BASENAMES))

JHU_DATA_DIR = COVID-19/csse_covid_19_data/csse_covid_19_time_series
DATA_TYPES = Confirmed Recovered Deaths
DATA_NAMES = $(addprefix time_series_19-covid-,$(DATA_TYPES))
JSON_FILES = $(addprefix $(WEBPAGE_DIR)/,$(addsuffix .json,$(DATA_NAMES)))

$(WEBPAGE_DIR)/%.json: $(JHU_DATA_DIR)/%.csv convert_data.py 
	python convert_data.py $< $@

deploy: .deploy
.deploy: $(JSON_FILES) $(WEBPAGE_SRC_FILES)
	cd $(WEBPAGE_DIR) ; $(foreach BUCKET, $(BUCKETS), syncobj -r -m . $(BUCKET): ;)
	@touch .deploy

clean:
	rm -f $(JSON_FILES) .deploy
