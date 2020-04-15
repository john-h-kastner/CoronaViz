all: deploy

BUCKETS = corona coronaviz

WEBPAGE_DIR = webpage
WEBPAGE_BASENAMES = index.html js_buzz.js js_buzz.css
WEBPAGE_SRC_FILES = $(addprefix $(WEBPAGE_DIR)/,$(WEBPAGE_BASENAMES))

$(WEBPAGE_DIR)/jhu_data.js: convert_data.py
	python convert_data.py

deploy: .deploy
.deploy: $(WEBPAGE_SRC_FILES) $(WEBPAGE_DIR)/jhu_data.js
	cd $(WEBPAGE_DIR) ; $(foreach BUCKET, $(BUCKETS), syncobj -r -m . $(BUCKET): ;)
	@touch .deploy

clean:
	rm -f .deploy webpage/jhu_data.js
