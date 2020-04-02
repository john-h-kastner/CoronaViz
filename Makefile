all: deploy

BUCKETS = corona coronaviz

WEBPAGE_DIR = webpage
WEBPAGE_BASENAMES = index.html js_buzz.js js_buzz.css
WEBPAGE_SRC_FILES = $(addprefix $(WEBPAGE_DIR)/,$(WEBPAGE_BASENAMES))

JHU_DATA_DIR = COVID-19/csse_covid_19_data/csse_covid_19_time_series
DATA_TYPES = confirmed recovered deaths
DATA_NAMES = $(addprefix time_series_19-covid-,$(DATA_TYPES))
JSON_FILES = $(addprefix $(WEBPAGE_DIR)/,$(addsuffix .js,$(DATA_NAMES)))

define JS_template =
$(WEBPAGE_DIR)/time_series_19-covid-$(1).js: convert_data.py
	python convert_data.py $(JHU_DATA_DIR)/time_series_covid19_$(1)_global.csv $(JHU_DATA_DIR)/time_series_covid19_$(1)_US.csv $$@ timeSeries$(1)
endef

$(foreach type,$(DATA_TYPES),$(eval $(call JS_template,$(type))))

deploy: .deploy
.deploy: $(JSON_FILES) $(WEBPAGE_SRC_FILES)
	cd $(WEBPAGE_DIR) ; $(foreach BUCKET, $(BUCKETS), syncobj -r -m . $(BUCKET): ;)
	@touch .deploy

clean:
	rm -f $(JSON_FILES) .deploy
