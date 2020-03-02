WEBPAGE_DIR= webpage
BUCKETS = corona coronaviz

deploy: .deploy
.deploy:
	$(foreach BUCKET, $(BUCKETS), syncobj -r -m $(WEBPAGE_DIR) $(BUCKET): ;)
	@touch $@

clean:
	rm -f .deploy
