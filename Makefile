NAME=LinkedInJobsFilterer
#
# The first time this extension was uploaded to the Chrome Web Store the
# private key was included in it but it doesn't need to be after that and I
# don't want to keep it in the source tree both because it's a security issue
# and Chrome complains about unpacked extensions with private key files in
# their directories.
#
#PRIVATE_KEY=key.pem
TEST_FILES=$(wildcard *.js) $(wildcard *.html) manifest.json options.html \
	     icons/16.png icons/48.png icons/128.png $(PRIVATE_KEY)
SHIP_FILES=$(filter-out tests.js,$(TEST_FILES))
ESLINT=node_modules/.bin/eslint

all: $(NAME).zip

$(NAME).zip: $(foreach f,$(SHIP_FILES),build/$(f))
	rm -f build/$@.tmp
	cd build && zip -r $@.tmp $(SHIP_FILES)
	mv -f build/$@.tmp $@

$(NAME)-test.zip: $(foreach f,$(TEST_FILES),build/$(f))
	rm -f build/$@.tmp
	cd build && zip -r $@.tmp $(TEST_FILES)
	mv -f build/$@.tmp $@

build/manifest.json: manifest.json
	@mkdir -p build
	rm -f $@.tmp
	grep -v '"key"' $< > $@.tmp
	mv $@.tmp $@

build/%: %
	@mkdir -p $(dir $@)
	cp $< $@

lint: $(ESLINT)
	$(ESLINT) .
	flake8 run-tests.py

test: test-config.yml $(NAME)-test.zip
	./run-tests.py $(TEST_ARGS)

$(ESLINT):
	npm install

clean:
	rm -rf $(NAME).zip $(NAME)-test.zip build
