FILES = index.html js_buzz.js js_buzz.css
BUCKET = corona

deploy: .deploy
.deploy: $(FILES)
	cpobj $(FILES) $(BUCKET):
	@touch $@

clean:
	rm -f .deploy
