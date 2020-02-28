FILES = index.html js_buzz.js js_buzz.css
BUCKETS = corona coronaviz

deploy: .deploy
.deploy: $(FILES)
	$(foreach BUCKET, $(BUCKETS), cpobj $(FILES) $(BUCKET): ;)
	@touch $@

clean:
	rm -f .deploy
