WEBPAGE_DIR= webpage
BUCKETS = corona coronaviz

deploy:
	cd $(WEBPAGE_DIR) ; $(foreach BUCKET, $(BUCKETS), syncobj -r -m . $(BUCKET): ;)
